import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import {
    emptyAddress as initialAddress,
    getAddresses,
    normalizeAddress,
    removeAddress,
    saveAddress,
    setDefaultAddress,
} from "../../services/userService";
import { calculateCheckoutPricing } from "../../services/cartService";
import {
    quoteCheckout,
    startCheckout,
    getActiveCheckout,
    getCheckoutAttempt,
    openPayment,
} from "../../services/paymentService";
import { getProductPath } from "../../utils/productVariants";

import AddressForm, { validateAddress } from "../../components/AddressForm";
import AddressSelector from "../../components/AddressSelector";
import CheckoutSummary from "./CheckoutSummary";

const COUPON_STORAGE_KEY = "zupito_checkout_coupon";

const formatPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
}).format;

const formatAddress = (address) =>
    [address.house, address.area, address.landmark, address.city, address.state, address.pincode]
        .filter(Boolean)
        .join(", ");

function loadCoupon(accountId) {
    try {
        return window.sessionStorage.getItem(`${COUPON_STORAGE_KEY}:${accountId}`) || "";
    } catch {
        return "";
    }
}

function SelectedAddressCard({ address, onChange, onAdd, onEdit, onDelete }) {
    return (
        <div className="checkout-selected-address">
            <div className="checkout-selected-address-top">
                <div className="checkout-selected-address-label">
                    <i className="fa-solid fa-circle-check" aria-hidden="true" />
                    <strong>{address.type || "Delivery Address"}</strong>
                    <span>Selected</span>
                </div>

                <button type="button" className="checkout-address-change" onClick={onChange}>
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

function Checkout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { items, ready, loading: cartLoading, error: cartError, refreshCart } = useCart();

    const accountId = user?._id || user?.id || "";
    const addressBusy = useRef(false);

    const [addressLoading, setAddressLoading] = useState(true);
    const [addressesReady, setAddressesReady] = useState(false);
    const [addressError, setAddressError] = useState("");
    const [processing, setProcessing] = useState(false);

    const [address, setAddress] = useState(initialAddress);
    const [submitted, setSubmitted] = useState(false);
    const [addressBook, setAddressBook] = useState({
        addresses: [],
        selectedId: null,
        version: 0,
    });
    const [couponCode, setCouponCode] = useState(() => loadCoupon(accountId));
    const [serverQuote, setServerQuote] = useState(null);

    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [addressDialogMode, setAddressDialogMode] = useState("list");
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [deletingAddressId, setDeletingAddressId] = useState(null);

    const savedAddresses = addressBook.addresses;
    const selectedAddressId = addressBook.selectedId;
    const selectedAddress = savedAddresses.find(
        (item) => String(item.id) === String(selectedAddressId)
    );

    const deliveryAddress = selectedAddress || address;
    const errors = validateAddress(deliveryAddress);

    // Load checkout details and recover an existing payment.
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

        getActiveCheckout(accountId)
            .then((pending) => {
                if (active && pending.order) {
                    navigate(`/payment-status?order=${pending.order.orderId}`, {
                        replace: true,
                    });
                }
            })
            .catch(() => {});

        refreshCart();

        return () => {
            active = false;
        };
    }, [accountId, refreshCart, navigate]);

    useEffect(() => {
        try {
            if (couponCode) {
                window.sessionStorage.setItem(`${COUPON_STORAGE_KEY}:${accountId}`, couponCode);
            } else {
                window.sessionStorage.removeItem(`${COUPON_STORAGE_KEY}:${accountId}`);
            }
        } catch {
            // Coupon selection remains usable in the current page.
        }
    }, [couponCode, accountId]);

    useEffect(() => {
        if (!couponCode || !addressBook.selectedId || !ready) return;
        let active = true;
        quoteCheckout(addressBook.selectedId, couponCode)
            .then((quote) => {
                if (active) setServerQuote(quote);
            })
            .catch((error) => {
                if (!active) return;
                setServerQuote(null);
                setCouponCode("");
                toast.error(error.message);
            });
        return () => {
            active = false;
        };
    }, [couponCode, addressBook.selectedId, items, ready]);

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
            mrp: Number.isFinite(rawMrp) && rawMrp > price ? rawMrp : price,
            stock: Number.isInteger(rawStock) && rawStock >= 0 ? rawStock : 0,
            validPrice,
        };
    });

    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

    const canCheckout =
        ready &&
        !cartError &&
        !addressError &&
        cartItems.length > 0 &&
        cartItems.every(
            ({ quantity, stock, validPrice }) =>
                validPrice && Number.isInteger(quantity) && quantity > 0 && quantity <= stock
        );

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
        if (addressBusy.current || addressLoading || processing) return null;

        addressBusy.current = true;
        setProcessing(true);

        try {
            const data = await setDefaultAddress(id, addressBook.version);
            setAddressBook(data);
            setSubmitted(false);
            setServerQuote(null);
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
        if (addressBusy.current || addressLoading || processing) return null;

        addressBusy.current = true;
        setProcessing(true);

        try {
            const data = await saveAddress(input, addressBook.version, true);
            setAddressBook({ ...data, selectedId: data.addressId });
            setSubmitted(false);
            setServerQuote(null);

            toast.success(
                input.id ? "Address updated successfully." : "Address saved successfully."
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
        if (addressBusy.current || addressLoading || processing) return null;

        addressBusy.current = true;
        setProcessing(true);

        try {
            const data = await removeAddress(id, addressBook.version);
            setAddressBook(data);

            if (!data.addresses.length) {
                setAddress({ ...initialAddress });
            }

            setSubmitted(false);
            setServerQuote(null);
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

    // Validate once, then open Razorpay directly.
    const handleCheckout = async (event) => {
        event.preventDefault();

        if (addressBusy.current || processing || addressLoading || cartLoading || !ready) {
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
                toast.error("Some products are unavailable. Please update your cart.");
                return;
            }

            const changed =
                freshCart.items.length !== items.length ||
                freshCart.items.some((item) => {
                    const old = items.find((entry) => entry.product._id === item.product._id);

                    return (
                        !old ||
                        old.quantity !== item.quantity ||
                        old.product.price !== item.product.price ||
                        old.product.mrp !== item.product.mrp
                    );
                });

            if (changed) {
                toast.info(
                    "Your cart changed. Review the latest prices and quantities before continuing."
                );
                return;
            }

            let book = await getAddresses();

            if (selectedAddress) {
                const latest = book.addresses.find((item) => item.id === selectedAddress.id);

                setAddressBook(book);

                if (!latest || book.selectedId !== latest.id) {
                    toast.error(
                        "Your address selection changed. Review the selected address before continuing."
                    );
                    return;
                }

                if (
                    JSON.stringify(normalizeAddress(latest)) !==
                    JSON.stringify(normalizeAddress(selectedAddress))
                ) {
                    toast.info(
                        "Your address changed. Review the updated details before continuing."
                    );
                    return;
                }
            } else {
                book = await saveAddress(address, book.version, true);
                setAddressBook({ ...book, selectedId: book.addressId });
            }

            setAddressError("");

            const addressId = book.addressId || book.selectedId;
            const quote = await quoteCheckout(addressId, couponCode);
            const displayedPricing =
                serverQuote?.pricing || calculateCheckoutPricing(cartItems, couponCode);

            const priceFields = [
                "originalPrice",
                "productDiscount",
                "couponDiscount",
                "deliveryCharge",
                "total",
            ];

            const pricingChanged = priceFields.some(
                (field) =>
                    Math.round(Number(displayedPricing[field]) * 100) !==
                    Math.round(Number(quote.pricing[field]) * 100)
            );

            setServerQuote(quote);

            // Ask for review only when the displayed pricing actually changes.
            if (pricingChanged) {
                toast.info("Checkout changed. Review the updated total before continuing.");
                return;
            }

            const result = await startCheckout({
                addressId,
                couponCode,
                quoteToken: quote.quoteToken,
                attemptId: getCheckoutAttempt(accountId, quote.quoteToken),
            });

            try {
                await openPayment(result);
            } finally {
                navigate(`/payment-status?order=${result.order.orderId}`);
            }
        } catch (failure) {
            toast.error(failure.message);

            const pending = await getActiveCheckout(accountId).catch(() => null);

            if (pending?.order) {
                navigate(`/payment-status?order=${pending.order.orderId}`);
            }
        } finally {
            addressBusy.current = false;
            setProcessing(false);
        }
    };

    if (!user) {
        return <Navigate to="/login" replace state={{ returnTo: location.pathname }} />;
    }

    if (!ready || !addressesReady) {
        return (
            <section className="checkout-page">
                <div className="container-fluid website-shell">
                    <p role="status">{cartError || "Loading checkout…"}</p>

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
                <nav className="products-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <Link to="/cart">Cart</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <span aria-current="page">Checkout</span>
                </nav>

                <div className="cart-page-header">
                    <div>
                        <h1>Checkout</h1>
                        <p>Complete your delivery details and review your order.</p>
                    </div>

                    <Link to="/cart" className="cart-continue">
                        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                        Back to Cart
                    </Link>
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

                <form className="checkout-layout" onSubmit={handleCheckout} noValidate>
                    <div className="checkout-main">
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
                                        onEdit={() => openAddressDialog("edit", selectedAddress.id)}
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
                                    Your delivery address will be saved automatically for future
                                    orders.
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
                                                                    product.packLabel,
                                                                ].filter(Boolean)
                                                            ),
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
                    </div>

                    {/* Order Summary */}
                    <div className="checkout-side">
                        <CheckoutSummary
                            cartItems={cartItems}
                            couponCode={couponCode}
                            onCouponChange={async (code) => {
                                if (addressBusy.current)
                                    throw new Error("Please wait for the address update.");
                                const addressId = addressBook.selectedId;
                                if (!addressId)
                                    throw new Error(
                                        "Save and select a delivery address before applying a coupon."
                                    );
                                const quote = await quoteCheckout(addressId, code);
                                setCouponCode(code);
                                setServerQuote(quote);
                            }}
                            serverPricing={serverQuote?.pricing}
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
                            disabled={!canCheckout || processing || cartLoading || addressLoading}
                        >
                            {processing ? "Opening payment…" : "Continue to Payment"}
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </button>

                        <p className="checkout-security-text">
                            <i className="fa-solid fa-lock" aria-hidden="true" />
                            Choose your payment method securely on Razorpay.
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
        </section>
    );
}

export default Checkout;
