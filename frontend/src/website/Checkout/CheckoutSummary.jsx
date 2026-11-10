import { calculateCheckoutPricing, coupons } from "../../services/cartService";
import { useState } from "react";
import { Button, TextField } from "@mui/material";

const formatPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
}).format;

function CheckoutSummary({ cartItems = [], couponCode, onCouponChange, serverPricing }) {
    const [couponInput, setCouponInput] = useState("");
    const [localCoupon, setLocalCoupon] = useState("");
    const [couponError, setCouponError] = useState("");

    // Supports both standalone and parent-controlled coupon state.
    const controlled = typeof couponCode === "string" && typeof onCouponChange === "function";

    const selectedCoupon = controlled ? couponCode : localCoupon;

    const updateCoupon = (code) => {
        if (controlled) {
            onCouponChange(code);
        } else {
            setLocalCoupon(code);
        }
    };

    const pricing = serverPricing || calculateCheckoutPricing(cartItems, selectedCoupon);
    const invalidCoupon = selectedCoupon && !pricing.appliedCoupon;
    const visibleCouponError =
        couponError || (invalidCoupon ? "Coupon is not eligible for this order value." : "");

    const {
        itemCount,
        originalPrice,
        subtotal,
        productDiscount,
        couponDiscount,
        deliveryCharge,
        amountForFreeDelivery,
        total,
        totalSavings,
        appliedCoupon
    } = pricing;

    // Remove coupon automatically when cart becomes ineligible.

    const handleApplyCoupon = () => {
        const code = couponInput.trim().toUpperCase();

        if (!code) {
            setCouponError("Please enter a coupon code.");
            return;
        }

        const coupon = coupons[code];

        if (!coupon) {
            setCouponError("Invalid coupon code. Please try another.");
            return;
        }

        if (subtotal < coupon.minAmount) {
            setCouponError(`Minimum order of ${formatPrice(coupon.minAmount)} required.`);
            return;
        }

        updateCoupon(code);
        setCouponInput("");
        setCouponError("");
    };

    const handleRemoveCoupon = () => {
        updateCoupon("");
        setCouponInput("");
        setCouponError("");
    };

    return (
        <aside className="cart-panel checkout-summary" aria-label="Order summary">
            <div className="cart-panel-header">
                <h2>Order Summary</h2>
            </div>

            <div className="cart-summary-content">
                {/* Price Details */}
                <div className="cart-summary-list">
                    <div className="cart-summary-row">
                        <span>
                            Price ({itemCount} {itemCount === 1 ? "item" : "items"})
                        </span>
                        <strong>{formatPrice(originalPrice)}</strong>
                    </div>

                    {productDiscount > 0 && (
                        <div className="cart-summary-row cart-summary-discount">
                            <span>Product Discount</span>
                            <strong>-{formatPrice(productDiscount)}</strong>
                        </div>
                    )}

                    {couponDiscount > 0 && (
                        <div className="cart-summary-row cart-summary-discount">
                            <span>Coupon Discount</span>
                            <strong>-{formatPrice(couponDiscount)}</strong>
                        </div>
                    )}

                    <div className="cart-summary-row">
                        <span>Delivery Charges</span>
                        <strong className={deliveryCharge === 0 ? "cart-summary-discount" : ""}>
                            {deliveryCharge === 0 ? "FREE" : formatPrice(deliveryCharge)}
                        </strong>
                    </div>
                </div>

                {/* Delivery Information */}
                <div className="checkout-delivery-message">
                    <i
                        className={`fa-solid ${deliveryCharge === 0 ? "fa-truck-fast" : "fa-circle-info"}`}
                        aria-hidden="true"
                    />

                    <span>
                        {deliveryCharge === 0
                            ? "Free delivery on your order"
                            : `Add ${formatPrice(amountForFreeDelivery)} more for FREE delivery`}
                    </span>
                </div>

                {/* Apply Coupon */}
                <div className="checkout-coupon">
                    <div className="checkout-coupon-heading">
                        <i className="fa-solid fa-ticket" aria-hidden="true" />
                        <h3>Apply Coupon</h3>
                    </div>

                    {appliedCoupon ? (
                        <div className="checkout-coupon-applied">
                            <div>
                                <strong>{appliedCoupon}</strong>

                                <span>
                                    <i className="fa-solid fa-circle-check" aria-hidden="true" />
                                    Coupon applied successfully
                                </span>
                            </div>

                            <button
                                type="button"
                                className="checkout-coupon-remove"
                                onClick={handleRemoveCoupon}
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="checkout-coupon-form">
                                <TextField
                                    className="checkout-coupon-input"
                                    label="Coupon Code"
                                    variant="outlined"
                                    size="small"
                                    value={couponInput}
                                    onChange={(event) => {
                                        setCouponInput(event.target.value.toUpperCase());
                                        setCouponError("");
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            handleApplyCoupon();
                                        }
                                    }}
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 30,
                                            autoComplete: "off"
                                        }
                                    }}
                                    error={Boolean(visibleCouponError)}
                                    fullWidth
                                />

                                <Button
                                    type="button"
                                    variant="contained"
                                    className="checkout-coupon-apply"
                                    onClick={handleApplyCoupon}
                                >
                                    Apply
                                </Button>
                            </div>

                            {visibleCouponError && (
                                <p className="checkout-coupon-error" role="alert">
                                    {visibleCouponError}
                                </p>
                            )}

                            <p className="checkout-coupon-hint">
                                Available offers: <strong>ZUPITO10</strong> (10% off, up to ₹100, ₹499+ order)
                                and <strong>WELCOME50</strong> (₹50 off, ₹999+ order).
                            </p>
                        </>
                    )}
                </div>

                {/* Final Payable Amount */}
                <div className="cart-summary-total">
                    <strong>Total Amount</strong>
                    <strong>{formatPrice(total)}</strong>
                </div>

                {totalSavings > 0 && (
                    <div className="cart-summary-savings">
                        <i className="fa-solid fa-tag" aria-hidden="true" />
                        You save {formatPrice(totalSavings)} on this order
                    </div>
                )}

                <p className="cart-summary-secure">
                    <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                    Secure Online Payment
                </p>
            </div>
        </aside>
    );
}

export default CheckoutSummary;
