import {
    getOrderId,
    normalizeStatus,
    getStatusLabel,
    getStatusCategory,
    getProductName,
    getProductLink,
    getOrderTotal,
    getItemId,
    getParcelStatus,
    buildOrderParcels,
    getOverallStatus,
    getDeliveryInfo,
    getParcelOtp
} from "../utils/orderStatus";
import formatDate from "../utils/formatDate";
import formatMoney from "../utils/formatCurrency";
import ParcelTimeline from "../components/OrderTimeline";
import ParcelDeliveryOtp from "../components/DeliveryOTP";
import OrderItemImage from "../components/OrderItems";

import { useEffect, useState } from "react";
import { getCustomerOrder } from "../services/orderService";
import { Link, useParams } from "react-router-dom";
import ReviewForm from "../components/ReviewForm";
import InvoiceDownload from "../components/InvoiceDownload";
import OrderCancellation, { RefundStatus } from "../components/OrderCancellation";
import ReplacementRequest, { ReplacementStatus } from "./ReplacementRequest";

import { SHOW_DEMO_ORDERS, demoOrders, demoAddress } from "../data/orderPreview";

function OrderDetailsContent({
    order = null,
    orders = null,
    loading = false,
    error = "",
    onRetry,
    onCancel,
    onRequestReplacement,
    onSubmitReview,
    onDownloadInvoice
}) {
    const { orderId } = useParams();

    const [visibleOtps, setVisibleOtps] = useState({});
    const [replacementOpen, setReplacementOpen] = useState(false);
    const [reviewItem, setReviewItem] = useState(null);

    const hasRealData = Boolean(order) || Array.isArray(orders);

    const isDemo = SHOW_DEMO_ORDERS && !hasRealData;

    const realOrder =
        order && getOrderId(order) === orderId
            ? order
            : Array.isArray(orders)
              ? orders.find((item) => getOrderId(item) === orderId)
              : null;

    const sampleOrder = isDemo ? demoOrders.find((item) => getOrderId(item) === orderId) : null;

    const selectedOrder = realOrder || sampleOrder || null;

    const items = Array.isArray(selectedOrder?.items) ? selectedOrder.items : [];

    const parcels = buildOrderParcels(selectedOrder, isDemo);

    const status = getOverallStatus(selectedOrder, parcels);
    const statusCategory = getStatusCategory(status);

    const orderDeliveryInfo =
        selectedOrder && parcels.length > 1
            ? {
                  label: "Delivery Schedule",
                  value: "See package details",
                  type: "expected"
              }
            : selectedOrder && parcels.length === 1
              ? getDeliveryInfo(parcels[0], getParcelStatus(parcels[0]), selectedOrder)
              : null;

    const address = selectedOrder
        ? selectedOrder.shippingAddress || selectedOrder.deliveryAddress || (isDemo ? demoAddress : null)
        : null;

    const payment = selectedOrder?.payment || {};

    const paymentMethod = payment.method || selectedOrder?.paymentMethod || (isDemo ? "Online Payment" : "");

    const paymentStatus = String(
        payment.status || selectedOrder?.paymentStatus || (isDemo ? "Paid (Demo)" : "")
    );

    const paymentIsPaid = ["paid", "paid_(demo)", "paid_demo", "completed", "success"].includes(
        normalizeStatus(paymentStatus)
    );

    const isItemDelivered = (item, itemIndex) => {
        return parcels.some((parcel) => {
            if (getParcelStatus(parcel) !== "delivered") {
                return false;
            }

            // Match the exact item within a delivered package.
            if (isDemo && Array.isArray(parcel.itemIndexes) && parcel.itemIndexes.includes(itemIndex)) {
                return true;
            }

            const orderItemId = getItemId(item);

            return parcel.items.some((parcelItem) => {
                if (parcelItem === item) return true;

                const parcelItemId = getItemId(parcelItem);

                return Boolean(orderItemId) && parcelItemId === orderItemId;
            });
        });
    };

    const deliveredItems = items.flatMap((item, index) => {
        const declaredEligible =
            isDemo || item.replacementEligible === true || selectedOrder?.replacementEligible === true;
        if (
            !isItemDelivered(item, index) ||
            !declaredEligible ||
            item.replacementEligible === false ||
            selectedOrder?.replacementEligible === false
        )
            return [];

        return [isDemo ? { ...item, demoItemId: `preview-item-${index}` } : item];
    });

    const canReplace = deliveredItems.length > 0;
    const canCancel = parcels.some((parcel) =>
        ["placed", "confirmed", "processing", "packing", "packed", "ready_for_pickup"].includes(
            getParcelStatus(parcel)
        )
    );

    if (loading || error || !selectedOrder) {
        return (
            <div className="customer-order-detail-page">
                <Link to="/account/orders" className="customer-detail-back">
                    <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                    Back to My Orders
                </Link>

                <div className="customer-detail-feedback">
                    <span>
                        <i
                            className={`fa-solid ${
                                loading
                                    ? "fa-spinner fa-spin"
                                    : error
                                      ? "fa-circle-exclamation"
                                      : "fa-box-open"
                            }`}
                            aria-hidden="true"
                        />
                    </span>

                    <h2>
                        {loading
                            ? "Loading order details"
                            : error
                              ? "Unable to load order"
                              : "Order not found"}
                    </h2>

                    <p>
                        {loading
                            ? "Retrieving the latest order information."
                            : error ||
                              (isDemo
                                  ? "This order is not available in the sample order list."
                                  : "Order information is unavailable.")}
                    </p>

                    {!loading && error && typeof onRetry === "function" && (
                        <button type="button" className="customer-detail-primary-button" onClick={onRetry}>
                            Try Again
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const totalAmount = getOrderTotal(selectedOrder);
    const pricing = selectedOrder.pricing || {};

    const summaryRows = [
        {
            label: "Subtotal",
            value: pricing.subtotal ?? selectedOrder.subtotal
        },
        {
            label: "Delivery Fee",
            value: pricing.shippingFee ?? selectedOrder.shippingFee
        },
        {
            label: "Discount",
            value: pricing.discount ?? selectedOrder.discount,
            discount: true
        }
    ].filter((row) => row.value !== undefined && row.value !== null);

    return (
        <div className="customer-order-detail-page">
            <Link to="/account/orders" className="customer-detail-back">
                <i className="fa-solid fa-arrow-left" aria-hidden="true" />
                Back to My Orders
            </Link>

            {/* Page Heading */}
            <div className="customer-detail-heading">
                <div>
                    <span className="customer-detail-eyebrow">ORDER INFORMATION</span>

                    <h2>Order Details</h2>

                    <p>Review your order items, payment and delivery information.</p>

                    {isDemo && (
                        <span className="customer-detail-demo-label">
                            <i className="fa-solid fa-flask" aria-hidden="true" />
                            Demo Preview — Sample order
                        </span>
                    )}
                </div>

                <span className="customer-detail-heading-icon">
                    <i className="fa-solid fa-receipt" aria-hidden="true" />
                </span>
            </div>

            {/* Order Overview */}
            <div className="customer-detail-overview">
                <div className="customer-detail-overview-top">
                    <div>
                        <span>ORDER ID</span>
                        <strong>{orderId}</strong>
                    </div>

                    <span className={`customer-detail-status is-${statusCategory}`}>
                        <i className="fa-solid fa-circle" aria-hidden="true" />

                        {getStatusLabel(status)}
                    </span>
                </div>

                <div className="customer-detail-overview-info">
                    <div>
                        <span>Order Placed</span>

                        <strong>{formatDate(selectedOrder.createdAt)}</strong>
                    </div>

                    <div>
                        <span>{orderDeliveryInfo.label}</span>

                        <strong className={`customer-detail-date is-${orderDeliveryInfo.type}`}>
                            {orderDeliveryInfo.value}
                        </strong>
                    </div>

                    <div>
                        <span>Order Total</span>

                        <strong className="customer-detail-total">{formatMoney(totalAmount)}</strong>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="customer-detail-grid">
                {/* Main Column */}
                <div className="customer-detail-main">
                    {/* Ordered Products */}
                    <section className="customer-detail-card">
                        <div className="customer-detail-card-heading">
                            <span className="customer-detail-card-icon">
                                <i className="fa-solid fa-box" aria-hidden="true" />
                            </span>

                            <div>
                                <h3>Order Items</h3>

                                <p>
                                    {items.length} {items.length === 1 ? "item" : "items"} in this order
                                </p>
                            </div>
                        </div>

                        <div className="customer-detail-items">
                            {items.length ? (
                                items.map((item, index) => {
                                    const price = item.unitPrice ?? item.price ?? item.productSnapshot?.price;

                                    const quantity = Number(item.quantity) || 1;

                                    const delivered = isItemDelivered(item, index);
                                    const productPath = getProductLink(item, isDemo);

                                    return (
                                        <div className="customer-detail-item" key={getItemId(item) || index}>
                                            <OrderItemImage item={item} />

                                            <div className="customer-detail-item-info">
                                                <h4>
                                                    {productPath ? (
                                                        <Link
                                                            to={productPath}
                                                            className="customer-detail-product-title-link"
                                                        >
                                                            {getProductName(item)}
                                                        </Link>
                                                    ) : (
                                                        getProductName(item)
                                                    )}
                                                </h4>

                                                {item.variantName && <p>{item.variantName}</p>}

                                                <div className="customer-detail-item-meta">
                                                    <span>Quantity: {quantity}</span>

                                                    {delivered && (
                                                        <button
                                                            type="button"
                                                            className="customer-detail-rate-button"
                                                            onClick={() => setReviewItem(item)}
                                                        >
                                                            <i
                                                                className="fa-solid fa-star"
                                                                aria-hidden="true"
                                                            />
                                                            Rate & Review
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {price !== undefined && price !== null && (
                                                <strong className="customer-detail-item-price">
                                                    {formatMoney(price)}
                                                </strong>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="customer-detail-unavailable">
                                    Item information is unavailable.
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Parcel Delivery Tracking */}
                    <section className="customer-detail-card">
                        <div className="customer-detail-card-heading">
                            <span className="customer-detail-card-icon">
                                <i className="fa-solid fa-truck-fast" aria-hidden="true" />
                            </span>

                            <div>
                                <h3>Delivery Tracking</h3>

                                <p>
                                    {parcels.length} {parcels.length === 1 ? "package" : "packages"} in this
                                    order
                                </p>
                            </div>
                        </div>

                        <div className="customer-detail-parcels">
                            {parcels.map((parcel, index) => {
                                const parcelStatus = getParcelStatus(parcel, status);

                                const parcelCategory = getStatusCategory(parcelStatus);

                                const deliveryInfo = getDeliveryInfo(
                                    parcel,
                                    parcelStatus,
                                    parcels.length === 1 ? selectedOrder : null
                                );

                                const parcelItems = Array.isArray(parcel.items) ? parcel.items : [];

                                const otp = getParcelOtp(parcel);

                                const canViewOtp =
                                    parcelStatus === "out_for_delivery" &&
                                    Boolean(otp) &&
                                    !parcel.otpVerified &&
                                    !parcel.delivery?.otpVerified;

                                return (
                                    <article key={parcel.id} className="customer-detail-parcel">
                                        {/* Package Heading */}
                                        <div className="customer-detail-parcel-heading">
                                            <div className="customer-detail-parcel-title">
                                                <span>
                                                    <i className="fa-solid fa-box" aria-hidden="true" />
                                                </span>

                                                <div>
                                                    <h4>Package {index + 1}</h4>

                                                    <p title={parcel.id}>{parcel.id}</p>
                                                </div>
                                            </div>

                                            <span className={`customer-detail-status is-${parcelCategory}`}>
                                                <i className="fa-solid fa-circle" aria-hidden="true" />

                                                {getStatusLabel(parcelStatus)}
                                            </span>
                                        </div>

                                        {/* Package Summary */}
                                        <div className="customer-detail-parcel-summary">
                                            <div>
                                                <span>{deliveryInfo.label}</span>

                                                <strong
                                                    className={`customer-detail-date is-${deliveryInfo.type}`}
                                                >
                                                    {deliveryInfo.value}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>Products</span>

                                                <strong>
                                                    {parcelItems.length
                                                        ? parcelItems.map(getProductName).join(", ")
                                                        : "Item details unavailable"}
                                                </strong>
                                            </div>
                                        </div>

                                        {/* Package Timeline */}
                                        <ParcelTimeline
                                            parcel={parcel}
                                            order={selectedOrder}
                                            isDemo={isDemo}
                                        />

                                        {/* Package Delivery OTP */}
                                        {canViewOtp && (
                                            <div className="customer-detail-parcel-otp">
                                                <ParcelDeliveryOtp
                                                    otp={otp}
                                                    isDemo={isDemo}
                                                    visible={Boolean(visibleOtps[parcel.id])}
                                                    onToggle={() =>
                                                        setVisibleOtps((previous) => ({
                                                            ...previous,
                                                            [parcel.id]: !previous[parcel.id]
                                                        }))
                                                    }
                                                />
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    {/* Order Actions */}
                    {(canCancel || canReplace) && (
                        <section className="customer-detail-actions">
                            <div>
                                <h3>Order Actions</h3>
                                <p>Manage available actions for this order.</p>
                            </div>
                            {canCancel && (
                                <OrderCancellation
                                    order={selectedOrder}
                                    parcels={parcels}
                                    isDemo={isDemo}
                                    onCancel={onCancel}
                                />
                            )}
                            {canReplace && (
                                <button
                                    type="button"
                                    className="customer-detail-replace-button"
                                    onClick={() => setReplacementOpen(true)}
                                >
                                    <i className="fa-solid fa-rotate" aria-hidden="true" />
                                    Request Replacement
                                </button>
                            )}
                        </section>
                    )}

                    {/* Refund and Replacement Tracking */}
                    <RefundStatus order={selectedOrder} parcels={parcels} isDemo={isDemo} />
                    <ReplacementStatus order={selectedOrder} />
                </div>

                {/* Right Column */}
                <aside className="customer-detail-side">
                    {/* Delivery Address */}
                    <section className="customer-detail-card">
                        <div className="customer-detail-card-heading">
                            <span className="customer-detail-card-icon">
                                <i className="fa-solid fa-location-dot" aria-hidden="true" />
                            </span>

                            <div>
                                <h3>Delivery Address</h3>
                                <p>Order destination</p>
                            </div>
                        </div>

                        <div className="customer-detail-address">
                            {address ? (
                                <>
                                    <strong>{address.name || "Customer"}</strong>

                                    <p>
                                        {[address.house, address.area, address.landmark]
                                            .filter(Boolean)
                                            .join(", ")}
                                    </p>

                                    <p>
                                        {[address.city, address.state].filter(Boolean).join(", ")}
                                        {address.pincode ? ` - ${address.pincode}` : ""}
                                    </p>

                                    {address.phone && (
                                        <span>
                                            <i className="fa-solid fa-phone" aria-hidden="true" />

                                            {address.phone}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <p className="customer-detail-unavailable">Delivery address unavailable.</p>
                            )}
                        </div>
                    </section>

                    {/* Payment Summary */}
                    <section className="customer-detail-card">
                        <div className="customer-detail-card-heading">
                            <span className="customer-detail-card-icon">
                                <i className="fa-solid fa-credit-card" aria-hidden="true" />
                            </span>

                            <div>
                                <h3>Payment Summary</h3>

                                <p>Order payment information</p>
                            </div>
                        </div>

                        <div className="customer-detail-payment">
                            <div>
                                <span>Payment Method</span>

                                <strong>{paymentMethod || "Unavailable"}</strong>
                            </div>

                            <div>
                                <span>Payment Status</span>

                                <strong className={paymentIsPaid ? "is-paid" : ""}>
                                    {paymentStatus || "Unavailable"}
                                </strong>
                            </div>

                            {summaryRows.length > 0 && (
                                <div className="customer-detail-price-breakdown">
                                    {summaryRows.map((row) => (
                                        <div key={row.label}>
                                            <span>{row.label}</span>

                                            <strong>
                                                {row.discount ? "−" : ""}
                                                {formatMoney(row.value)}
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="customer-detail-grand-total">
                                <span>Total Amount</span>

                                <strong>{formatMoney(totalAmount)}</strong>
                            </div>

                            <InvoiceDownload
                                order={selectedOrder}
                                address={address}
                                isDemo={isDemo}
                                onDownload={onDownloadInvoice}
                            />
                        </div>
                    </section>

                    {/* Support */}
                    <div className="customer-detail-help">
                        <span>
                            <i className="fa-solid fa-headset" aria-hidden="true" />
                        </span>

                        <div>
                            <h3>Need Help?</h3>

                            <p>Have a question about this order?</p>

                            <Link to={`/account/complaints?orderId=${encodeURIComponent(orderId)}`}>
                                Contact Support
                                <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Product Review Form */}
            <ReviewForm
                open={Boolean(reviewItem)}
                onClose={() => setReviewItem(null)}
                orderId={orderId}
                item={reviewItem}
                onSubmit={onSubmitReview}
            />

            {/* Replacement Request */}
            <ReplacementRequest
                open={replacementOpen}
                onClose={() => setReplacementOpen(false)}
                order={selectedOrder}
                items={deliveredItems}
                address={address}
                isDemo={isDemo}
                onSubmit={onRequestReplacement}
            />
        </div>
    );
}

export default function OrderDetails() {
    const { orderId } = useParams();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        let active = true;

        setLoading(true);
        setOrder(null);

        getCustomerOrder(orderId)
            .then((data) => {
                if (active) {
                    setOrder(data);
                    setError("");
                }
            })
            .catch((failure) => {
                if (active) setError(failure.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [orderId, revision]);

    return (
        <OrderDetailsContent
            key={orderId}
            order={order}
            orders={[]}
            loading={loading}
            error={error}
            onRetry={() => setRevision((value) => value + 1)}
        />
    );
}