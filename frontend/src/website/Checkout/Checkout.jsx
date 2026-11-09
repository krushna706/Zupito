import { useEffect, useRef, useState } from "react";
import {
    Link,
    Navigate,
    useLocation,
    useNavigate
} from "react-router-dom";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle
} from "@mui/material";
import { toast } from "react-toastify";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

import {
    emptyAddress as initialAddress,
    getAddresses,
    normalizeAddress,
    removeAddress,
    saveAddress,
    setDefaultAddress
} from "../../services/userService";

import { getProductPath } from "../../utils/productVariants";
import AddressForm, { validateAddress } from "../../components/AddressForm";
import AddressSelector from "../../components/AddressSelector";
import CheckoutSummary from "./CheckoutSummary";
import { calculateCheckoutPricing } from "../../services/cartService";

const COUPON_STORAGE_KEY = "zupito_checkout_coupon";

const formatPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
}).format;

const formatAddress = (address) =>
    [
        address.house,
        address.area,
        address.landmark,
        address.city,
        address.state,
        address.pincode
    ]
        .filter(Boolean)
        .join(", ");

function loadCoupon(accountId) {
    try {
        return window.sessionStorage.getItem(
            `${COUPON_STORAGE_KEY}:${accountId}`
        ) || "";
    } catch {
        return "";
    }
}

function SelectedAddressCard({
    address,
    onChange,
    onAdd,
    onEdit,
    onDelete
}) {
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

                <button
                    type="button"
                    className="is-danger"
                    onClick={onDelete}
                >
                    <i className="fa-regular fa-trash-can" aria-hidden="true" />
                    Delete
                </button>
            </div>
        </div>
    );
}

function Checkout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const {
        items,
        ready,
        loading: cartLoading,
        error: cartError,
        refreshCart
    } = useCart();

    const accountId = user?._id || user?.id || "";

    const [addressLoading, setAddressLoading] = useState(true);
    const [addressesReady, setAddressesReady] = useState(false);
    const [addressError, setAddressError] = useState("");
    const [processing, setProcessing] = useState(false);

    const addressBusy = useRef(false);

    const [step, setStep] = useState("checkout");
    const [address, setAddress] = useState(initialAddress);
    const [submitted, setSubmitted] = useState(false);

    const [addressBook, setAddressBook] = useState({
        addresses: [],
        selectedId: null,
        version: 0
    });

    const [couponCode, setCouponCode] = useState(
        () => loadCoupon(accountId)
    );

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

    useEffect(() => {
        if (!accountId) return;

        let active = true;

        getAddresses()
            .then((data) => {
                if (active) {
                    setAddressBook(data);
                    setAddressError("");
                }
            })
            .catch((failure) => {
                if (active) setAddressError(failure.message);
            })
            .finally(() => {
                if (active) {
                    setAddressLoading(false);
                    setAddressesReady(true);
                }
            });

        refreshCart();

        return () => {
            active = false;
        };
    }, [accountId, refreshCart]);

    useEffect(() => {
        try {
            const key = `${COUPON_STORAGE_KEY}:${accountId}`;

            if (couponCode) {
                window.sessionStorage.setItem(key, couponCode);
            } else {
                window.sessionStorage.removeItem(key);
            }
        } catch {
            // Coupon selection remains usable in the current page.
        }
    }, [couponCode, accountId]);

    const cartItems = items.map(({ product, quantity }) => {
        const rawPrice = Number(product.price);
        const rawMrp = Number(product.mrp);
        const rawStock = Number(product.stock);

        const validPrice =
            product.validPrice !== false &&
            product.availableForPurchase !== false &&
            Number.isFinite(rawPrice) &&
            rawPrice > 0;

        const price = validPrice ? rawPrice : 0;

        return {
            product,
            quantity,
            price,
            mrp:
                Number.isFinite(rawMrp) && rawMrp > price
                    ? rawMrp
                    : price,
            stock:
                Number.isInteger(rawStock) && rawStock >= 0
                    ? rawStock
                    : 0,
            validPrice
        };
    });

    const itemCount = cartItems.reduce(
        (total, item) => total + item.quantity,
        0
    );

    const canCheckout =
        ready &&
        !cartError &&
        !addressError &&
        cartItems.length > 0 &&
        cartItems.every(
            ({ quantity, stock, validPrice }) =>
                validPrice &&
                Number.isInteger(quantity) &&
                quantity > 0 &&
                quantity <= stock
        );

    // Shared pricing for Checkout and Payment Status.
    const pricing = calculateCheckoutPricing(cartItems, couponCode);

    const openAddressDialog = (mode = "list", id = null) => {
        if (processing || addressLoading) return;

        setAddressDialogMode(mode);
        setEditingAddressId(mode === "edit" ? id : null);
        setDeletingAddressId(mode === "delete" ? id : null);
        setAddressDialogOpen(true);
    };

    const loadAddresses = async () => {
        if (addressBusy.current) return;

        setAddressLoading(true);

        try {
            const data = await getAddresses();

            setAddressBook(data);

            setAddressError("");
        } catch (failure) {
            setAddressError(failure.message);
        } finally {
            setAddressLoading(false);
            setAddressesReady(true);
        }
    };

const handleSelectAddress = async (id) => {
    if (
        addressBusy.current ||
        addressLoading ||
        processing
    ) {
        return null;
    }

    addressBusy.current = true;
    setProcessing(true);

    try {
        const data = await setDefaultAddress(
            id,
            addressBook.version
        );

        setAddressBook(data);
        setSubmitted(false);
        setStep("checkout");

        return data;
    } catch (failure) {
        toast.error(failure.message);

        addressBusy.current = false;
        await loadAddresses();

        return null;
    } finally {
        addressBusy.current = false;
        setProcessing(false);
    }
};

    const handleSaveAddress = async (input) => {
        if (
            addressBusy.current ||
            addressLoading ||
            processing
        ) {
            return null;
        }

        addressBusy.current = true;
        setProcessing(true);

        try {
            const data = await saveAddress(
                input,
                addressBook.version,
                true
            );

            setAddressBook({
                ...data,
                selectedId: data.addressId
            });

            setSubmitted(false);
            setStep("checkout");

            toast.success(
                input.id
                    ? "Address updated successfully."
                    : "Address saved successfully."
            );

            return data;
        } catch (failure) {
            toast.error(failure.message);

            addressBusy.current = false;
            await loadAddresses();

            return null;
        } finally {
            addressBusy.current = false;
            setProcessing(false);
        }
    };

    const handleDeleteAddress = async (id) => {
        if (
            addressBusy.current ||
            addressLoading ||
            processing
        ) {
            return null;
        }

        addressBusy.current = true;
        setProcessing(true);

        try {
            const data = await removeAddress(
                id,
                addressBook.version
            );

            setAddressBook(data);

            if (!data.addresses.length) {
                setAddress({ ...initialAddress });
            }

            setSubmitted(false);
            setStep("checkout");

            toast.success("Address deleted successfully.");

            return data;
        } catch (failure) {
            toast.error(failure.message);

            addressBusy.current = false;
            await loadAddresses();

            return null;
        } finally {
            addressBusy.current = false;
            setProcessing(false);
        }
    };

    const createOrderPreview = (timestamp) => ({
        orderId: `ZUP-${timestamp}`,
        createdAt: new Date(timestamp).toISOString(),
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
                packLabel: product.packLabel
            }
        })),

        summary: { ...pricing },
        couponCode: pricing.appliedCoupon
    });

    const handlePaymentResult = (status, timestamp) => {
        if (!canCheckout || !selectedAddress) {
            setPaymentDialogOpen(false);
            setStep("checkout");

            toast.error(
                "Please review your cart and delivery address."
            );
            return;
        }

        const successful = status === "success";
        const order = successful
            ? createOrderPreview(timestamp)
            : null;

        setPaymentDialogOpen(false);

        navigate("/payment-status", {
            state: {
                status,
                simulated: true,
                amount: pricing.total,
                orderId: order?.orderId,
                order
            }
        });
    };

    const handleCheckout = async (event) => {
        event.preventDefault();

        if (
            addressBusy.current ||
            processing ||
            addressLoading ||
            cartLoading ||
            !ready
        ) {
            return;
        }

        setSubmitted(true);

        if (Object.values(errors).some(Boolean)) {
            toast.error("Please enter valid delivery address details.");
            return;
        }

        addressBusy.current = true;
        setProcessing(true);

        try {
            const freshCart = await refreshCart();

            if (!freshCart) return;

            if (!freshCart.canCheckout) {
                setStep("checkout");
                toast.error(
                    "Some products are unavailable. Please update your cart."
                );
                return;
            }

            const changed =
                freshCart.items.length !== items.length ||
                freshCart.items.some((item) => {
                    const old = items.find(
                        (entry) =>
                            entry.product._id === item.product._id
                    );

                    return (
                        !old ||
                        old.quantity !== item.quantity ||
                        old.product.price !== item.product.price ||
                        old.product.mrp !== item.product.mrp
                    );
                });

            if (changed) {
                setStep("checkout");
                toast.info(
                    "Your cart changed. Review the latest prices and quantities before continuing."
                );
                return;
            }

            let book = await getAddresses();

            if (selectedAddress) {
                const latest = book.addresses.find(
                    (item) => item.id === selectedAddress.id
                );

                setAddressBook({
                    ...book,
                    selectedId: latest?.id || null
                });

                if (!latest) {
                    setStep("checkout");
                    toast.error(
                        "The selected address was removed. Please select an address again."
                    );
                    return;
                }

                if (
                    JSON.stringify(normalizeAddress(latest)) !==
                    JSON.stringify(normalizeAddress(selectedAddress))
                ) {
                    setStep("checkout");
                    toast.info(
                        "Your address changed. Review the updated details before continuing."
                    );
                    return;
                }
            } else {
                book = await saveAddress(address, book.version, true);

                setAddressBook({
                    ...book,
                    selectedId: book.addressId
                });
            }

            setAddressError("");

            if (step === "payment") {
                setPaymentDialogOpen(true);
            } else {
                setStep("payment");
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        } catch (failure) {
            toast.error(failure.message);
        } finally {
            addressBusy.current = false;
            setProcessing(false);
        }
    };

    const handleBack = () => {
        setStep("checkout");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ returnTo: location.pathname }}
            />
        );
    }

    if (!ready || !addressesReady) {
        return (
            <section className="checkout-page">
                <div className="container-fluid website-shell">
                    <p role="status">
                        {cartError || "Loading checkout…"}
                    </p>

                    {cartError && (
                        <button
                            type="button"
                            className="cart-primary"
                            onClick={refreshCart}
                            disabled={cartLoading}
                        >
                            Retry
                        </button>
                    )}
                </div>
            </section>
        );
    }

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

                        <Link
                            to="/products"
                            className="cart-primary cart-explore"
                        >
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
                <nav className="products-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <Link to="/cart">Cart</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <span aria-current="page">
                        {step === "payment" ? "Payment" : "Checkout"}
                    </span>
                </nav>

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

                {(addressError || cartError) && (
                    <div className="alert alert-danger" role="alert">
                        {addressError || cartError}

                        <button
                            type="button"
                            className="btn btn-link"
                            disabled={processing || cartLoading}
                            onClick={() => {
                                loadAddresses();
                                refreshCart();
                            }}
                        >
                            Retry
                        </button>
                    </div>
                )}

                <form
                    className="checkout-layout"
                    onSubmit={handleCheckout}
                    noValidate
                >
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
                                                onEdit={() =>
                                                    openAddressDialog("edit", selectedAddress.id)
                                                }
                                                onDelete={() =>
                                                    openAddressDialog("delete", selectedAddress.id)
                                                }
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
                                                    disabled={processing}
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
                                        {cartItems.map(
                                            ({ product, quantity, price, stock, validPrice }) => (
                                                <li key={product._id} className="checkout-item">
                                                    <Link
                                                        to={
                                                            product.productPath ||
                                                            getProductPath(
                                                                product.productId || product._id,
                                                                product.variantId
                                                            )
                                                        }
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
                                                            to={
                                                                product.productPath ||
                                                                getProductPath(
                                                                    product.productId || product._id,
                                                                    product.variantId
                                                                )
                                                            }
                                                            className="checkout-item-name"
                                                        >
                                                            {product.name}
                                                        </Link>

                                                        {(product.variantLabel || product.packLabel) && (
                                                            <p className="checkout-item-variant">
                                                                {[
                                                                    ...new Set(
                                                                        [
                                                                            product.variantLabel,
                                                                            product.packLabel
                                                                        ].filter(Boolean)
                                                                    )
                                                                ].join(" · ")}
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
                                            )
                                        )}
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
                                                <i
                                                    className="fa-solid fa-mobile-screen-button"
                                                    aria-hidden="true"
                                                />
                                                UPI
                                            </span>
                                            <span>
                                                <i className="fa-regular fa-credit-card" aria-hidden="true" />
                                                Cards
                                            </span>
                                            <span>
                                                <i
                                                    className="fa-solid fa-building-columns"
                                                    aria-hidden="true"
                                                />
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
                                                onEdit={() =>
                                                    openAddressDialog("edit", selectedAddress.id)
                                                }
                                                onDelete={() =>
                                                    openAddressDialog("delete", selectedAddress.id)
                                                }
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
                                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                                Some products are unavailable. Please update your cart.
                            </p>
                        )}

                        <button
                            type="submit"
                            className="checkout-pay-button"
                            disabled={
                                !canCheckout ||
                                processing ||
                                cartLoading ||
                                addressLoading
                            }
                        >
                            {processing
                                ? "Checking checkout…"
                                : step === "payment"
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
                            onClick={() =>
                                handlePaymentResult("success", Date.now())
                            }
                        >
                            Simulate Successful Payment
                        </Button>

                        <Button
                            type="button"
                            variant="outlined"
                            color="error"
                            onClick={() =>
                                handlePaymentResult("failed", Date.now())
                            }
                        >
                            Simulate Failed Payment
                        </Button>

                        <Button
                            type="button"
                            variant="outlined"
                            color="warning"
                            onClick={() =>
                                handlePaymentResult("cancelled", Date.now())
                            }
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