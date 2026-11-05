import { Link, useLocation, useParams } from "react-router-dom";

const formatPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
}).format;

const formatAddress = (address) =>
    [address.house, address.area, address.landmark, address.city, address.state, address.pincode]
        .filter(Boolean)
        .join(", ");

const getAmount = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : 0;
};

function OrderConfirmation() {
    const { orderId } = useParams();
    const { state } = useLocation();

    const order = state?.order;
    const isDemo = state?.simulated === true;

    const hasOrder = Boolean(
        isDemo &&
            order &&
            Array.isArray(order.items) &&
            order.items.length > 0 &&
            order.address &&
            order.summary &&
            String(order.orderId) === String(orderId)
    );

    if (!hasOrder) {
        return (
            <section className="order-confirmation-page">
                <div className="container-fluid website-shell">
                    <nav className="products-breadcrumb" aria-label="Breadcrumb">
                        <Link to="/">Home</Link>
                        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                        <span aria-current="page">Order Confirmation</span>
                    </nav>

                    <div className="cart-page-header">
                        <div>
                            <h1>Order Confirmation</h1>
                            <p>View your order details.</p>
                        </div>
                    </div>

                    <div className="cart-panel cart-empty">
                        <div className="cart-empty-icon">
                            <i className="fa-solid fa-receipt" aria-hidden="true" />
                        </div>

                        <h2>Order Details Unavailable</h2>
                        <p>Order preview details are unavailable. Please return to checkout.</p>

                        <Link to="/checkout" className="cart-primary cart-explore">
                            Back to Checkout
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    const { items, address, summary, paymentMethod = "Online Payment", createdAt } = order;

    const itemCount = items.reduce((total, item) => total + getAmount(item.quantity), 0);

    const originalPrice = getAmount(
        summary.originalPrice ?? getAmount(summary.subtotal) + getAmount(summary.productDiscount)
    );

    const productDiscount = getAmount(summary.productDiscount);
    const couponDiscount = getAmount(summary.couponDiscount);
    const deliveryCharge = getAmount(summary.deliveryCharge);
    const total = getAmount(summary.total);
    const totalSavings = productDiscount + couponDiscount;

    const orderDate = createdAt ? new Date(createdAt) : null;
    const validOrderDate = orderDate && !Number.isNaN(orderDate.getTime());

    return (
        <section className="order-confirmation-page">
            <div className="container-fluid website-shell">
                <nav className="products-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Home</Link>
                    <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                    <span aria-current="page">Order Confirmation</span>
                </nav>
                <div className="cart-page-header">
                    <div>
                        <h1>Order Confirmation</h1>
                        <p>Review your order and payment details.</p>
                    </div>

                    <Link to="/products" className="cart-continue">
                        <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                        Continue Shopping
                    </Link>
                </div>

                {/* Confirmation Banner */}
                <div className="order-confirmation-hero">
                    <div className="order-confirmation-hero-main">
                        <span className="order-confirmation-hero-icon">
                            <i className="fa-solid fa-circle-check" aria-hidden="true" />
                        </span>

                        <div className="order-confirmation-hero-text">
                            <h2>Order Preview Ready!</h2>
                            <p>Your payment simulation was successful. Review your order details below.</p>
                        </div>
                    </div>

                    <span className="order-confirmation-preview-badge">
                        <i className="fa-solid fa-circle-info" aria-hidden="true" />
                        Demo Preview
                    </span>
                </div>

                {/* Order Reference */}
                <div className="order-confirmation-reference">
                    <div>
                        <span>Order Reference</span>
                        <strong>{order.orderId}</strong>
                    </div>

                    {validOrderDate && (
                        <div>
                            <span>Order Date</span>
                            <strong>
                                {orderDate.toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric"
                                })}
                            </strong>
                        </div>
                    )}

                    <div>
                        <span>Payment Status</span>
                        <strong className="order-confirmation-payment-badge">
                            <i className="fa-solid fa-check-circle" aria-hidden="true" />
                            Simulated Success
                        </strong>
                    </div>
                </div>

                <div className="checkout-layout">
                    <div className="checkout-main">
                        {/* Ordered Products */}
                        <section className="checkout-card">
                            <div className="checkout-card-header">
                                <span className="checkout-section-icon">
                                    <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                                </span>

                                <div className="checkout-card-title">
                                    <h2>Order Items</h2>
                                    <p>Products included in your order.</p>
                                </div>

                                <span className="checkout-item-badge">
                                    {itemCount} {itemCount === 1 ? "Item" : "Items"}
                                </span>
                            </div>

                            <ul className="checkout-items">
                                {items.map((item, index) => {
                                    const product = item.product || item;
                                    const quantity = getAmount(item.quantity);
                                    const price = getAmount(item.price ?? product.price);

                                    return (
                                        <li
                                            key={`${product._id ?? product.id ?? index}-${index}`}
                                            className="checkout-item"
                                        >
                                            <div className="checkout-item-image">
                                                {product.image ? (
                                                    <img
                                                        src={product.image}
                                                        alt={product.name || "Product"}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <i className="fa-regular fa-image" aria-hidden="true" />
                                                )}
                                            </div>

                                            <div className="checkout-item-info">
                                                <strong className="checkout-item-name">
                                                    {product.name || "Product"}
                                                </strong>

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
                                            </div>

                                            <strong className="checkout-item-price">
                                                {formatPrice(price * quantity)}
                                            </strong>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>

                        {/* Delivery Address */}
                        <section className="checkout-card">
                            <div className="checkout-card-header">
                                <span className="checkout-section-icon">
                                    <i className="fa-solid fa-location-dot" aria-hidden="true" />
                                </span>

                                <div className="checkout-card-title">
                                    <h2>Delivery Address</h2>
                                    <p>Selected delivery location for this order.</p>
                                </div>
                            </div>

                            <div className="checkout-card-body">
                                <div className="order-confirmation-address">
                                    <div className="order-confirmation-address-heading">
                                        <strong>{address.name}</strong>

                                        {address.type && <span>{address.type}</span>}
                                    </div>

                                    <p>{formatAddress(address)}</p>

                                    <div className="order-confirmation-contact">
                                        <i className="fa-solid fa-phone" aria-hidden="true" />
                                        <span>{address.phone}</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Payment Information */}
                        <section className="checkout-card">
                            <div className="checkout-card-header">
                                <span className="checkout-section-icon">
                                    <i className="fa-solid fa-credit-card" aria-hidden="true" />
                                </span>

                                <div className="checkout-card-title">
                                    <h2>Payment Information</h2>
                                    <p>Details of your simulated payment.</p>
                                </div>
                            </div>

                            <div className="checkout-card-body">
                                <div className="order-confirmation-payment-details">
                                    <div>
                                        <span>Payment Method</span>
                                        <strong>{paymentMethod}</strong>
                                    </div>

                                    <div>
                                        <span>Payment Status</span>
                                        <strong className="order-confirmation-success-text">
                                            <i className="fa-solid fa-check-circle" aria-hidden="true" />
                                            Simulated Success
                                        </strong>
                                    </div>

                                    {summary.appliedCoupon && (
                                        <div>
                                            <span>Applied Coupon</span>
                                            <strong>{summary.appliedCoupon}</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Final Order Summary */}
                    <aside className="checkout-side">
                        <div className="cart-panel checkout-summary">
                            <div className="cart-panel-header">
                                <h2>Order Summary</h2>
                            </div>

                            <div className="cart-summary-content">
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

                                        <strong
                                            className={deliveryCharge === 0 ? "cart-summary-discount" : ""}
                                        >
                                            {deliveryCharge === 0 ? "FREE" : formatPrice(deliveryCharge)}
                                        </strong>
                                    </div>
                                </div>

                                <div className="cart-summary-total">
                                    <strong>Total Amount</strong>
                                    <strong>{formatPrice(total)}</strong>
                                </div>

                                {totalSavings > 0 && (
                                    <div className="cart-summary-savings">
                                        <i className="fa-solid fa-tag" aria-hidden="true" />
                                        You saved {formatPrice(totalSavings)}
                                    </div>
                                )}

                                <div className="order-confirmation-summary-note">
                                    <i className="fa-solid fa-circle-info" aria-hidden="true" />
                                    Frontend preview only. No real order or payment has been processed.
                                </div>
                            </div>
                        </div>

                        <Link to="/products" className="checkout-pay-button text-decoration-none">
                            Continue Shopping
                            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                        </Link>
                    </aside>
                </div>
            </div>
        </section>
    );
}

export default OrderConfirmation;
