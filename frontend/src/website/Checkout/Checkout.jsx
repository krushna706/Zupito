
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@mui/material";
import { toast } from "react-toastify";

import { useCart } from "../../context/CartContext";
import { getProductPath } from "../../utils/productVariants";
import AddressForm, { validateAddress } from "../../components/AddressForm";
import AddressSelector from "../../components/AddressSelector";
import CheckoutSummary, { calculateCheckoutPricing } from "./CheckoutSummary";

const ADDRESS_STORAGE_KEY = "zupito_delivery_addresses";
const COUPON_STORAGE_KEY = "zupito_checkout_coupon";

const initialAddress = {
    name: "",
    phone: "",
    pincode: "",
    house: "",
    area: "",
    city: "",
    state: "",
    landmark: "",
    type: "Home",
};

const formatPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
}).format;

const formatAddress = (address) => [
    address.house,
    address.area,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
].filter(Boolean).join(", ");

// ================== LOCAL ADDRESS STORAGE ==================
function loadAddressBook() {
    const fallback = {
        addresses: [],
        selectedId: null,
    };

    try {
        const raw = window.localStorage.getItem(ADDRESS_STORAGE_KEY);

        if (!raw) return fallback;

        const stored = JSON.parse(raw);

        const addresses = Array.isArray(stored?.addresses)
            ? stored.addresses.filter((item) => item && item.id)
            : [];

        const selectedExists = addresses.some(
            (item) => String(item.id) === String(stored.selectedId)
        );

        return {
            addresses,
            selectedId: selectedExists
                ? stored.selectedId
                : addresses[0]?.id ?? null,
        };
    } catch {
        return fallback;
    }
}

function loadCoupon() {
    try {
        return window.sessionStorage.getItem(COUPON_STORAGE_KEY) || "";
    } catch {
        return "";
    }
}

const createAddressId = () => (
    typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `address_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
);

const addressSignature = (address) => [
    "name",
    "phone",
    "pincode",
    "house",
    "area",
    "city",
    "state",
    "landmark",
].map((key) => String(address[key] ?? "").trim().toLowerCase()).join("|");

// ================== SELECTED ADDRESS CARD ==================
function SelectedAddressCard({ address, onChange, onAdd, onEdit, onDelete }) {
    return (
        <div className="checkout-selected-address">
            <div className="checkout-selected-address-top">
                <div className="checkout-selected-address-label">
                    <i className="fa-solid fa-circle-check" aria-hidden="true" />
                    <strong>{address.type || "Delivery Address"}</strong>
                    <span>Selected</span>
                </div>

                <button
                    type="button"
                    className="checkout-address-change"
                    onClick={onChange}
                >
                    Change Address
                </button>
            </div>

            <div className="checkout-selected-address-details">
                <strong>{address.name}</strong>
                <p>{formatAddress(address)}</p>
                <span>Mobile: {address.phone}</span>
            </div>

            <div className="checkout-selected-address-actions">
                <button type="button" onClick={onEdit}>
                    <i className="fa-regular fa-pen-to-square" aria-hidden="true" />
                    Edit
                </button>

                <button type="button" onClick={onAdd}>
                    <i className="fa-solid fa-plus" aria-hidden="true" />
                    Add New
                </button>

                <button type="button" className="is-danger" onClick={onDelete}>
                    <i className="fa-regular fa-trash-can" aria-hidden="true" />
                    Delete
                </button>
            </div>
        </div>
    );
}

// ================== CHECKOUT PAGE ==================
function Checkout() {
    const navigate = useNavigate();
    const { items } = useCart();

    const [step, setStep] = useState("checkout");
    const [address, setAddress] = useState(initialAddress);
    const [submitted, setSubmitted] = useState(false);
    const [addressBook, setAddressBook] = useState(loadAddressBook);
    const [couponCode, setCouponCode] = useState(loadCoupon);

    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [addressDialogMode, setAddressDialogMode] = useState("list");
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [deletingAddressId, setDeletingAddressId] = useState(null);

    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

    const savedAddresses = addressBook.addresses;
    const selectedAddressId = addressBook.selectedId;

    const selectedAddress = savedAddresses.find(
        (item) => String(item.id) === String(selectedAddressId)
    );

    const deliveryAddress = selectedAddress || address;
    const errors = validateAddress(deliveryAddress);

    // ================== LOCAL STORAGE ==================
    useEffect(() => {
        try {
            window.localStorage.setItem(
                ADDRESS_STORAGE_KEY,
                JSON.stringify(addressBook)
            );
        } catch {
            // Address form remains usable without browser storage.
        }
    }, [addressBook]);

    useEffect(() => {
        try {
            if (couponCode) {
                window.sessionStorage.setItem(COUPON_STORAGE_KEY, couponCode);
            } else {
                window.sessionStorage.removeItem(COUPON_STORAGE_KEY);
            }
        } catch {
            // Coupon selection remains usable in the current page.
        }
    }, [couponCode]);

    // ================== CART ITEMS ==================
    const cartItems = items.map(({ product, quantity }) => {
        const rawPrice = Number(product.price);
        const rawMrp = Number(product.mrp);
        const rawStock = Number(product.stock);

        const validPrice = Number.isFinite(rawPrice) && rawPrice >= 0;
        const price = validPrice ? rawPrice : 0;

        return {
            product,
            quantity,
            price,
            mrp: Number.isFinite(rawMrp) && rawMrp > price ? rawMrp : price,
            stock: Number.isInteger(rawStock) && rawStock >= 0 ? rawStock : 0,
            validPrice,
        };
    });

    const itemCount = cartItems.reduce(
        (total, item) => total + item.quantity, 0
    );

    const canCheckout = cartItems.length > 0 && cartItems.every(
        ({ quantity, stock, validPrice }) =>
            validPrice &&
            Number.isInteger(quantity) &&
            quantity > 0 &&
            quantity <= stock
    );

    // Shared pricing for Checkout and Payment Status.
    const pricing = calculateCheckoutPricing(cartItems, couponCode);

    // ================== ADDRESS ACTIONS ==================
    const openAddressDialog = (mode = "list", id = null) => {
        setAddressDialogMode(mode);
        setEditingAddressId(mode === "edit" ? id : null);
        setDeletingAddressId(mode === "delete" ? id : null);
        setAddressDialogOpen(true);
    };

    const handleSelectAddress = (id) => {
        setAddressBook((current) => ({
            ...current,
            selectedId: id,
        }));

        setSubmitted(false);
    };

    const handleSaveAddress = (input) => {
        const duplicate = !input.id && savedAddresses.find(
            (item) => addressSignature(item) === addressSignature(input)
        );

        const id = input.id || duplicate?.id || createAddressId();

        const savedAddress = {
            ...initialAddress,
            ...input,
            id,
        };

        setAddressBook((current) => {
            const exists = current.addresses.some(
                (item) => String(item.id) === String(id)
            );

            return {
                addresses: exists
                    ? current.addresses.map((item) => (
                        String(item.id) === String(id) ? savedAddress : item
                    ))
                    : [...current.addresses, savedAddress],
                selectedId: id,
            };
        });

        setSubmitted(false);

        toast.success(
            input.id
                ? "Address updated successfully."
                : "Address saved successfully."
        );
    };

    const handleDeleteAddress = (id) => {
        const remaining = savedAddresses.filter(
            (item) => String(item.id) !== String(id)
        );

        const wasSelected = String(selectedAddressId) === String(id);

        setAddressBook((current) => ({
            addresses: remaining,
            selectedId: wasSelected
                ? remaining[0]?.id ?? null
                : current.selectedId,
        }));

        if (remaining.length === 0) {
            setAddress({ ...initialAddress });
            setSubmitted(false);
        }

        if (wasSelected) {
            setStep("checkout");
        }

        toast.success("Address deleted successfully.");
    };

    // ================== ORDER PREVIEW ==================
    const createOrderPreview = () => ({
        orderId: `DEMO-${Date.now()}`,
        createdAt: new Date().toISOString(),
        paymentMethod: "Online Payment",
        paymentStatus: "Simulated",

        address: { ...deliveryAddress },

        items: cartItems.map(({ product, quantity, price, mrp }) => ({
            quantity,
            price,
            mrp,
            product: {
                _id: product._id,
                productId: product.productId,
                name: product.name,
                image: product.image,
                variantId: product.variantId,
                variantLabel: product.variantLabel,
                packLabel: product.packLabel,
            },
        })),

        summary: { ...pricing },
        couponCode: pricing.appliedCoupon,
    });

    // ================== PAYMENT ACTIONS ==================
    const handlePaymentResult = (status) => {
        if (!canCheckout || !selectedAddress) {
            setPaymentDialogOpen(false);
            setStep("checkout");
            toast.error("Please review your cart and delivery address.");
            return;
        }

        const successful = status === "success";
        const order = successful ? createOrderPreview() : null;

        setPaymentDialogOpen(false);

        navigate("/payment-status", {
            state: {
                status,
                simulated: true,
                amount: pricing.total,
                orderId: order?.orderId,
                order,
            },
        });
    };

    // ================== CHECKOUT FLOW ==================
    const handleCheckout = (event) => {
        event.preventDefault();

        if (!canCheckout) {
            toast.error("Some products are unavailable. Please update your cart.");
            return;
        }

        if (step === "payment") {
            if (!selectedAddress) {
                toast.error("Please select a delivery address.");
                setStep("checkout");
                return;
            }

            if (Object.values(validateAddress(selectedAddress)).some(Boolean)) {
                toast.error("Please update your delivery address.");
                setStep("checkout");
                return;
            }

            setPaymentDialogOpen(true);
            return;
        }

        setSubmitted(true);

        const invalidField = Object.keys(errors).find((key) => errors[key]);

        if (invalidField) {
            toast.error("Please enter valid delivery address details.");

            event.currentTarget
                .querySelector(`[name="${invalidField}"]`)
                ?.focus();

            return;
        }

        // Automatically save first-order delivery address.
        if (!selectedAddress) {
            handleSaveAddress(address);
        }

        setStep("payment");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleBack = () => {
        setStep("checkout");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    // ================== EMPTY CART ==================
    if (!cartItems.length) {
        return (
            <section className="checkout-page">
                <div className="container-fluid website-shell">
                    <div className="cart-panel cart-empty">
                        <div className="cart-empty-icon">
                            <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                        </div>

                        <h1>Your cart is empty</h1>
                        <p>Add products to your cart before proceeding to checkout.</p>

                        <Link to="/products" className="cart-primary cart-explore">
                            Explore Products
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="checkout-page">
            <div className="container-fluid website-shell">

                {/* Breadcrumb */}
                <nav className="products-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <Link to="/cart">Cart</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <span aria-current="page">
                        {step === "payment" ? "Payment" : "Checkout"}
                    </span>
                </nav>

                {/* Page Header */}
                <div className="cart-page-header">
                    <div>
                        <h1>{step === "payment" ? "Payment" : "Checkout"}</h1>
                        <p>
                            {step === "payment"
                                ? "Review your delivery details and complete your payment."
                                : "Complete your delivery details and review your order."}
                        </p>
                    </div>

                    {step === "payment" ? (
                        <button
                            type="button"
                            className="cart-continue"
                            onClick={handleBack}
                        >
                            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                            Back to Checkout
                        </button>
                    ) : (
                        <Link to="/cart" className="cart-continue">
                            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                            Back to Cart
                        </Link>
                    )}
                </div>

                <form className="checkout-layout" onSubmit={handleCheckout} noValidate>
                    <div className="checkout-main">

                        {step === "checkout" ? (
                            <>
                                {/* Delivery Address */}
                                <section className="checkout-card">
                                    <div className="checkout-card-header">
                                        <span className="checkout-section-icon">
                                            <i className="fa-solid fa-location-dot" aria-hidden="true" />
                                        </span>

                                        <div className="checkout-card-title">
                                            <h2>Delivery Address</h2>
                                            <p>Choose where your order should be delivered.</p>
                                        </div>
                                    </div>

                                    <div className="checkout-card-body">
                                        {selectedAddress ? (
                                            <SelectedAddressCard
                                                address={selectedAddress}
                                                onChange={() => openAddressDialog("list")}
                                                onAdd={() => openAddressDialog("add")}
                                                onEdit={() => openAddressDialog(
                                                    "edit",
                                                    selectedAddress.id
                                                )}
                                                onDelete={() => openAddressDialog(
                                                    "delete",
                                                    selectedAddress.id
                                                )}
                                            />
                                        ) : (
                                            <>
                                                <h3 className="checkout-subheading">
                                                    Enter Delivery Address
                                                </h3>

                                                <AddressForm
                                                    address={address}
                                                    onChange={setAddress}
                                                    errors={errors}
                                                    submitted={submitted}
                                                />
                                            </>
                                        )}

                                        <div className="checkout-address-note">
                                            <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                            Your delivery address will be saved automatically
                                            for future orders.
                                        </div>
                                    </div>
                                </section>

                                {/* Review Items */}
                                <section className="checkout-card">
                                    <div className="checkout-card-header">
                                        <span className="checkout-section-icon">
                                            <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                                        </span>

                                        <div className="checkout-card-title">
                                            <h2>Review Your Items</h2>
                                            <p>Check your products before continuing.</p>
                                        </div>

                                        <span className="checkout-item-badge">
                                            {itemCount} {itemCount === 1 ? "Item" : "Items"}
                                        </span>
                                    </div>

                                    <ul className="checkout-items">
                                        {cartItems.map(({
                                            product,
                                            quantity,
                                            price,
                                            stock,
                                            validPrice,
                                        }) => (
                                            <li key={product._id} className="checkout-item">
                                                <Link
                                                    to={product.productPath || getProductPath(
                                                        product.productId || product._id,
                                                        product.variantId
                                                    )}
                                                    className="checkout-item-image"
                                                    aria-label={`View ${product.name}`}
                                                >
                                                    {product.image ? (
                                                        <img
                                                            src={product.image}
                                                            alt={product.name}
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <i
                                                            className="fa-regular fa-image"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </Link>

                                                <div className="checkout-item-info">
                                                    <Link
                                                        to={product.productPath || getProductPath(
                                                            product.productId || product._id,
                                                            product.variantId
                                                        )}
                                                        className="checkout-item-name"
                                                    >
                                                        {product.name}
                                                    </Link>

                                                    {(product.variantLabel || product.packLabel) && (
                                                        <p className="checkout-item-variant">
                                                            {[...new Set([
                                                                product.variantLabel,
                                                                product.packLabel,
                                                            ].filter(Boolean))].join(" · ")}
                                                        </p>
                                                    )}

                                                    <span className="checkout-item-quantity">
                                                        Quantity: {quantity}
                                                    </span>

                                                    {(!validPrice || quantity > stock) && (
                                                        <p className="checkout-item-error">
                                                            Item unavailable
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="checkout-item-price">
                                                    {validPrice
                                                        ? formatPrice(price * quantity)
                                                        : "Unavailable"}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>

                                {/* Payment Method */}
                                <section className="checkout-card">
                                    <div className="checkout-card-header">
                                        <span className="checkout-section-icon">
                                            <i className="fa-solid fa-credit-card" aria-hidden="true" />
                                        </span>

                                        <div className="checkout-card-title">
                                            <h2>Payment Method</h2>
                                            <p>Online payment for your order.</p>
                                        </div>
                                    </div>

                                    <div className="checkout-card-body">
                                        <div className="checkout-payment-option">
                                            <span className="checkout-payment-icon">
                                                <i className="fa-solid fa-wallet" aria-hidden="true" />
                                            </span>

                                            <div className="checkout-payment-info">
                                                <strong>Online Payment</strong>
                                                <p>UPI, Debit/Credit Card and Net Banking</p>
                                            </div>

                                            <span className="checkout-payment-selected">
                                                <i className="fa-solid fa-check" aria-hidden="true" />
                                            </span>
                                        </div>

                                        <div className="checkout-payment-methods">
                                            <span>
                                                <i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />
                                                UPI
                                            </span>

                                            <span>
                                                <i className="fa-regular fa-credit-card" aria-hidden="true" />
                                                Cards
                                            </span>

                                            <span>
                                                <i className="fa-solid fa-building-columns" aria-hidden="true" />
                                                Net Banking
                                            </span>
                                        </div>

                                        <div className="checkout-payment-note">
                                            <i className="fa-solid fa-lock" aria-hidden="true" />
                                            Secure online payment via Razorpay.
                                        </div>
                                    </div>
                                </section>
                            </>
                        ) : (
                            <>
                                {/* Confirm Delivery Address */}
                                <section className="checkout-card">
                                    <div className="checkout-card-header">
                                        <span className="checkout-section-icon">
                                            <i className="fa-solid fa-location-dot" aria-hidden="true" />
                                        </span>

                                        <div className="checkout-card-title">
                                            <h2>Confirm Delivery Address</h2>
                                            <p>Review or change your selected address.</p>
                                        </div>
                                    </div>

                                    <div className="checkout-card-body">
                                        {selectedAddress && (
                                            <SelectedAddressCard
                                                address={selectedAddress}
                                                onChange={() => openAddressDialog("list")}
                                                onAdd={() => openAddressDialog("add")}
                                                onEdit={() => openAddressDialog(
                                                    "edit",
                                                    selectedAddress.id
                                                )}
                                                onDelete={() => openAddressDialog(
                                                    "delete",
                                                    selectedAddress.id
                                                )}
                                            />
                                        )}
                                    </div>
                                </section>

                                {/* Complete Payment */}
                                <section className="checkout-card">
                                    <div className="checkout-card-header">
                                        <span className="checkout-section-icon">
                                            <i className="fa-solid fa-credit-card" aria-hidden="true" />
                                        </span>

                                        <div className="checkout-card-title">
                                            <h2>Complete Your Payment</h2>
                                            <p>Review the final amount before paying.</p>
                                        </div>
                                    </div>

                                    <div className="checkout-card-body">
                                        <div className="checkout-payment-option">
                                            <span className="checkout-payment-icon">
                                                <i className="fa-solid fa-credit-card" aria-hidden="true" />
                                            </span>

                                            <div className="checkout-payment-info">
                                                <strong>Online Payment via Razorpay</strong>
                                                <p>UPI, Debit/Credit Card and Net Banking</p>
                                            </div>

                                            <span className="checkout-payment-selected">
                                                <i className="fa-solid fa-check" aria-hidden="true" />
                                            </span>
                                        </div>

                                        <div className="checkout-payment-note">
                                            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
                                            Check the final payable amount in your Order Summary.
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>

                    {/* Order Summary */}
                    <div className="checkout-side">
                        <CheckoutSummary
                            cartItems={cartItems}
                            couponCode={couponCode}
                            onCouponChange={setCouponCode}
                        />

                        {!canCheckout && (
                            <p className="checkout-error" role="alert">
                                <i
                                    className="fa-solid fa-triangle-exclamation"
                                    aria-hidden="true"
                                />
                                Some products are unavailable. Please update your cart.
                            </p>
                        )}

                        <button
                            type="submit"
                            className="checkout-pay-button"
                            disabled={!canCheckout}
                        >
                            {step === "payment"
                                ? "Pay Securely"
                                : "Continue to Payment"}

                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </button>

                        <p className="checkout-security-text">
                            <i className="fa-solid fa-lock" aria-hidden="true" />
                            Your payment details stay protected.
                        </p>
                    </div>
                </form>
            </div>

            {/* Saved Address Dialog */}
            {addressDialogOpen && (
                <AddressSelector
                    open={addressDialogOpen}
                    addresses={savedAddresses}
                    selectedAddressId={selectedAddressId}
                    initialMode={addressDialogMode}
                    editAddressId={editingAddressId}
                    initialDeleteId={deletingAddressId}
                    onClose={() => setAddressDialogOpen(false)}
                    onSelect={handleSelectAddress}
                    onSave={handleSaveAddress}
                    onDelete={handleDeleteAddress}
                />
            )}

            {/* Frontend Payment Preview */}
            <Dialog
                open={paymentDialogOpen}
                onClose={() => setPaymentDialogOpen(false)}
                fullWidth
                maxWidth="xs"
                aria-labelledby="payment-preview-title"
            >
                <DialogTitle id="payment-preview-title" className="fw-bold">
                    Payment Preview
                </DialogTitle>

                <DialogContent>
                    <p className="text-muted small mb-3">
                        Frontend payment simulation. No actual transaction will occur.
                    </p>

                    <div className="bg-light border rounded-3 p-3 mb-3">
                        <div className="d-flex justify-content-between gap-3">
                            <span className="text-muted small">Payable Amount</span>
                            <strong>{formatPrice(pricing.total)}</strong>
                        </div>

                        {pricing.appliedCoupon && (
                            <div className="d-flex justify-content-between gap-3 mt-2">
                                <span className="text-muted small">Applied Coupon</span>
                                <strong className="text-success small">
                                    {pricing.appliedCoupon}
                                </strong>
                            </div>
                        )}
                    </div>

                    <div className="d-grid gap-2">
                        <Button
                            type="button"
                            variant="contained"
                            color="success"
                            onClick={() => handlePaymentResult("success")}
                        >
                            Simulate Successful Payment
                        </Button>

                        <Button
                            type="button"
                            variant="outlined"
                            color="error"
                            onClick={() => handlePaymentResult("failed")}
                        >
                            Simulate Failed Payment
                        </Button>

                        <Button
                            type="button"
                            variant="outlined"
                            color="warning"
                            onClick={() => handlePaymentResult("cancelled")}
                        >
                            Simulate Cancelled Payment
                        </Button>
                    </div>
                </DialogContent>

                <DialogActions>
                    <Button
                        type="button"
                        onClick={() => setPaymentDialogOpen(false)}
                    >
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </section>
    );
}

export default Checkout;
