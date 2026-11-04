
import { Link, useLocation } from "react-router-dom";

const formatPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
}).format;

const statusConfig = {
    success: {
        title: "Payment Successful!",
        description: "Your payment simulation was completed successfully.",
        icon: "fa-circle-check",
        note: "This was a demo payment. No actual money was charged.",
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
        title: "Payment Details Unavailable",
        description: "No completed payment information was found.",
        icon: "fa-clock",
        note: "Please return to checkout to continue your order.",
    },
};

// ================== PAYMENT STATUS ==================
function PaymentStatus() {
    const location = useLocation();
    const payment = location.state || {};

    const status = payment.simulated === true &&
        ["success", "failed", "cancelled"].includes(payment.status)
        ? payment.status
        : "pending";

    const currentStatus = statusConfig[status];

    const amount = Number(payment.amount);
    const hasAmount = payment.amount != null &&
        Number.isFinite(amount) && amount > 0;

    const orderId = payment.orderId
        ? String(payment.orderId)
        : null;

    const paymentId = payment.paymentId
        ? String(payment.paymentId)
        : null;

    const order = payment.order;

    const hasOrder = status === "success" &&
        orderId &&
        order &&
        String(order.orderId) === orderId &&
        Array.isArray(order.items) &&
        order.items.length > 0 &&
        order.address &&
        order.summary;

    return (
        <section className="payment-status-page">
            <div className="container-fluid website-shell">

                {/* Breadcrumb */}
                <nav className="products-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <Link to="/cart">Cart</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <span aria-current="page">Payment Status</span>
                </nav>

                {/* Page Header */}
                <div className="cart-page-header">
                    <div>
                        <h1>Payment Status</h1>
                        <p>View your payment result and next steps.</p>
                    </div>
                </div>

                {/* Payment Result */}
                <div className={`payment-status-card is-${status}`}>
                    <div className="payment-status-content">

                        {/* Animated Status Icon */}
                        <div className="payment-status-icon" aria-hidden="true">
                            <i className={`fa-solid ${currentStatus.icon}`} />
                        </div>

                        <h2>{currentStatus.title}</h2>

                        <p className="payment-status-description">
                            {currentStatus.description}
                        </p>

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

                        {/* Payment Information */}
                        <div className="payment-status-note">
                            <i
                                className="fa-solid fa-circle-info"
                                aria-hidden="true"
                            />
                            <span>{currentStatus.note}</span>
                        </div>

                        {/* Next Actions */}
                        <div className="payment-status-actions">
                            {hasOrder ? (
                                <Link
                                    to={`/order-confirmation/${encodeURIComponent(orderId)}`}
                                    state={{
                                        order,
                                        simulated: true,
                                    }}
                                    className="payment-status-primary"
                                >
                                    <i
                                        className="fa-solid fa-receipt"
                                        aria-hidden="true"
                                    />
                                    View Order Confirmation
                                </Link>
                            ) : (
                                <Link
                                    to="/checkout"
                                    className="payment-status-primary"
                                >
                                    <i
                                        className="fa-solid fa-arrow-rotate-right"
                                        aria-hidden="true"
                                    />
                                    Back to Checkout
                                </Link>
                            )}

                            <Link
                                to="/products"
                                className="payment-status-secondary"
                            >
                                <i
                                    className="fa-solid fa-bag-shopping"
                                    aria-hidden="true"
                                />
                                Continue Shopping
                            </Link>
                        </div>
                    </div>

                    {/* Contact Support */}
                    <div className="payment-status-footer">
                        <i
                            className="fa-solid fa-headset"
                            aria-hidden="true"
                        />

                        <Link
                            to="/contact"
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
