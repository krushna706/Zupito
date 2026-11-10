import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

import {
    getPaymentStatus,
    openPayment,
    forgetCheckoutAttempt,
} from "../../services/paymentService";

const formatPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
}).format;

const statusConfig = {
    success: {
        title: "Payment Successful!",
        description: "Your payment is verified and your order is confirmed.",
        icon: "fa-circle-check",
        note: "You can view your confirmed order below.",
    },
    failed: {
        title: "Payment Failed",
        description: "Your payment attempt was unsuccessful.",
        icon: "fa-circle-xmark",
        note: "You can return to checkout and try again.",
    },
    cancelled: {
        title: "Payment Cancelled",
        description: "Your payment process was cancelled.",
        icon: "fa-circle-exclamation",
        note: "Your cart items are still available for checkout.",
    },
    pending: {
        title: "Payment Pending",
        description: "We are checking your payment status.",
        icon: "fa-clock",
        note: "If money was debited, wait for confirmation before making another payment.",
    },
};

function PaymentStatus() {
    const location = useLocation();
    const { user } = useAuth();
    const { refreshCart } = useCart();

    const id = new URLSearchParams(location.search).get("order");

    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [revision, setRevision] = useState(0);

    const paymentBusy = useRef(false);

    useEffect(() => {
        if (!user || !id) return;

        let active = true;
        let timer;
        let attempts = 0;

        async function check() {
            let terminal = false;

            try {
                const data = await getPaymentStatus(id);

                if (!active) return;

                setResult(data);
                setError("");

                terminal = [
                    "Confirmed",
                    "Expired",
                    "Refunded",
                    "PaymentReview",
                ].includes(data.order.status);

                if (terminal) {
                    forgetCheckoutAttempt(user._id || user.id);
                }

                if (data.order.status === "Confirmed") {
                    refreshCart();
                }
            } catch (failure) {
                if (!active) return;

                setError(failure.message);

                terminal = [401, 403, 404].includes(failure.status);
            }

            if (active && !terminal && ++attempts < 30) {
                timer = setTimeout(check, 5000);
            }
        }

        check();

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [user, id, refreshCart, revision]);

    const resume = async () => {
        if (paymentBusy.current) return;

        paymentBusy.current = true;
        setBusy(true);

        try {
            await openPayment(await getPaymentStatus(id));
        } catch (failure) {
            setError(failure.message);
        } finally {
            paymentBusy.current = false;
            setBusy(false);
            setRevision((value) => value + 1);
        }
    };

    const order = result?.order;

    const status =
        order?.status === "Confirmed"
            ? "success"
            : ["Expired", "Refunded"].includes(order?.status)
              ? "cancelled"
              : "pending";

    const currentStatus =
        order?.status === "Expired"
            ? {
                  ...statusConfig.cancelled,
                  title: "Checkout Expired",
                  description: "This checkout reservation has expired.",
              }
            : order?.status === "PaymentReview"
              ? {
                    ...statusConfig.pending,
                    title: "Payment Needs Review",
                    description:
                        "The late-payment reversal could not complete. Contact support with this order reference.",
                }
              : order?.status === "Refunding"
                ? {
                      ...statusConfig.pending,
                      title: "Payment Reversal Pending",
                      description:
                          "Payment arrived after checkout expired. Its reversal is being processed.",
                  }
                : order?.status === "Refunded"
                  ? {
                        ...statusConfig.cancelled,
                        title: "Payment Reversed",
                        description:
                            "The late payment was refunded. No order was placed.",
                    }
                  : statusConfig[status];

    const amount = order?.totalAmount;
    const hasAmount = Number.isFinite(amount);
    const orderId = order?.orderId;
    const paymentId = order?.paymentId;
    const hasOrder = status === "success";

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{
                    returnTo: location.pathname + location.search,
                }}
            />
        );
    }

    return (
        <section className="payment-status-page">
            <div className="container-fluid website-shell">
                <nav className="products-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <Link to="/cart">Cart</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <span aria-current="page">Payment Status</span>
                </nav>

                <div className="cart-page-header">
                    <div>
                        <h1>Payment Status</h1>
                        <p>View your payment result and next steps.</p>
                    </div>
                </div>

                {/* Payment Result */}
                <div className={`payment-status-card is-${status}`}>
                    <div className="payment-status-content">
                        <div className="payment-status-icon" aria-hidden="true">
                            <i className={`fa-solid ${currentStatus.icon}`} />
                        </div>

                        <h2>{currentStatus.title}</h2>

                        <p className="payment-status-description">
                            {error ||
                                (!id
                                    ? "Open a checkout to view its payment status."
                                    : currentStatus.description)}
                        </p>

                        {order?.status === "Confirmed" && !order.cartCleared && (
                            <p>
                                Your cart changed during payment and was retained.
                                Review it before ordering again.
                            </p>
                        )}

                        {/* Payment Details */}
                        {(hasAmount || orderId || paymentId) && (
                            <div className="payment-status-details">
                                {hasAmount && (
                                    <div className="payment-status-detail-row">
                                        <span>Payment Amount</span>
                                        <strong>{formatPrice(amount)}</strong>
                                    </div>
                                )}

                                {orderId && (
                                    <div className="payment-status-detail-row">
                                        <span>Order ID</span>
                                        <strong>{orderId}</strong>
                                    </div>
                                )}

                                {paymentId && (
                                    <div className="payment-status-detail-row">
                                        <span>Payment ID</span>
                                        <strong>{paymentId}</strong>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="payment-status-note">
                            <i className="fa-solid fa-circle-info" aria-hidden="true" />
                            <span>{currentStatus.note}</span>
                        </div>

                        {/* Next Actions */}
                        <div className="payment-status-actions">
                            {hasOrder ? (
                                <Link
                                    to={`/order-confirmation/${encodeURIComponent(orderId)}`}
                                    className="payment-status-primary"
                                >
                                    <i className="fa-solid fa-receipt" aria-hidden="true" />
                                    View Order Confirmation
                                </Link>
                            ) : result?.checkout ? (
                                <button
                                    type="button"
                                    className="payment-status-primary"
                                    disabled={busy}
                                    onClick={resume}
                                >
                                    {busy ? "Opening Payment…" : "Resume Payment"}
                                </button>
                            ) : (
                                <Link
                                    to="/checkout"
                                    className="payment-status-primary"
                                >
                                    <i className="fa-solid fa-arrow-rotate-right" aria-hidden="true" />
                                    Back to Checkout
                                </Link>
                            )}

                            {id && !hasOrder && (
                                <button
                                    type="button"
                                    className="payment-status-secondary"
                                    disabled={busy}
                                    onClick={() => setRevision((value) => value + 1)}
                                >
                                    Check Status
                                </button>
                            )}

                            <Link
                                to="/products"
                                className="payment-status-secondary"
                            >
                                <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                                Continue Shopping
                            </Link>
                        </div>
                    </div>

                    <div className="payment-status-footer">
                        <i className="fa-solid fa-headset" aria-hidden="true" />

                        <Link
                            to="/account/complaints"
                            className="payment-status-help-link"
                        >
                            Need help? Our support team is here to assist you.
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default PaymentStatus;