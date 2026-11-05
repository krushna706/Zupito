import { getOrderId, getOrderTotal, getProductName } from "../utils/orderStatus";
import formatDate from "../utils/formatDate";
import formatAmount from "../utils/formatCurrency";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const PAGE_SIZE = 5;
import { SHOW_DEMO_ORDERS, demoOrders } from "../data/orderPreview";

const statusFilters = [
    { value: "all", label: "All Orders" },
    { value: "progress", label: "In Progress" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" }
];

function getStatus(order) {
    return String(order?.orderStatus || order?.status || "");
}

function getStatusGroup(status) {
    const value = status.toLowerCase().replace(/[\s-]+/g, "_");

    if (value === "delivered") return "delivered";

    if (value.includes("cancel") || value.includes("refund")) {
        return "cancelled";
    }

    const progressStatuses = [
        "placed",
        "confirmed",
        "processing",
        "packing",
        "packed",
        "ready_for_pickup",
        "picked_up",
        "shipped",
        "in_transit",
        "out_for_delivery",
        "partially_delivered"
    ];

    return progressStatuses.includes(value) ? "progress" : "other";
}

function formatStatus(status) {
    if (!status) return "Status Unavailable";

    return status.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getProductImage(item) {
    const image =
        item?.productSnapshot?.image || item?.product?.images?.[0] || item?.product?.image || item?.image;

    return typeof image === "string" ? image : image?.url || image?.secure_url || "";
}

function getDeliveryInfo(order) {
    const statusGroup = getStatusGroup(getStatus(order));

    if (statusGroup === "cancelled") {
        return {
            label: "Delivery",
            value: "Cancelled",
            type: "cancelled"
        };
    }

    if (statusGroup === "delivered") {
        const deliveredAt = order?.deliveredAt ?? order?.deliveryDate ?? order?.delivery?.deliveredAt ?? null;

        return {
            label: "Delivered On",
            value: deliveredAt ? formatDate(deliveredAt) : "Date unavailable",
            type: "delivered"
        };
    }

    const expectedDeliveryAt =
        order?.expectedDeliveryAt ??
        order?.expectedDeliveryDate ??
        order?.estimatedDeliveryAt ??
        order?.delivery?.expectedDeliveryAt ??
        null;

    return {
        label: "Expected Delivery",
        value: expectedDeliveryAt ? formatDate(expectedDeliveryAt) : "Awaiting estimate",
        type: "expected"
    };
}

function OrderThumbnail({ item }) {
    const image = getProductImage(item);
    const [failedImage, setFailedImage] = useState(null);
    const imageError = failedImage === image;

    return (
        <div className="customer-order-product-image">
            {image && !imageError ? (
                <img
                    src={image}
                    alt={getProductName(item)}
                    loading="lazy"
                    onError={() => setFailedImage(image)}
                />
            ) : (
                <i className="fa-solid fa-box-open" aria-hidden="true" />
            )}
        </div>
    );
}

function MyOrders({ orders = null, loading = false, error = "", onRetry }) {
    const [activeFilter, setActiveFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    // Actual orders take priority over demo data.
    const isDemo = SHOW_DEMO_ORDERS && !Array.isArray(orders);
    const hasData = Array.isArray(orders) || isDemo;

    const orderList = useMemo(
        () => (Array.isArray(orders) ? orders : isDemo ? demoOrders : []),
        [orders, isDemo]
    );

    const counts = useMemo(
        () => ({
            all: orderList.length,
            progress: orderList.filter((order) => getStatusGroup(getStatus(order)) === "progress").length,
            delivered: orderList.filter((order) => getStatusGroup(getStatus(order)) === "delivered").length,
            cancelled: orderList.filter((order) => getStatusGroup(getStatus(order)) === "cancelled").length
        }),
        [orderList]
    );

    const filteredOrders = useMemo(() => {
        const query = search.trim().toLowerCase();

        return orderList
            .filter((order) => activeFilter === "all" || getStatusGroup(getStatus(order)) === activeFilter)
            .filter((order) => {
                if (!query) return true;

                const orderId = getOrderId(order).toLowerCase();

                const productNames = Array.isArray(order.items)
                    ? order.items.map(getProductName).join(" ").toLowerCase()
                    : "";

                return orderId.includes(query) || productNames.includes(query);
            })
            .sort((a, b) => {
                const first = Date.parse(a.createdAt || "") || 0;
                const second = Date.parse(b.createdAt || "") || 0;

                return second - first;
            });
    }, [orderList, activeFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

    const currentPage = Math.min(page, totalPages);

    const visibleOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const changeFilter = (value) => {
        setActiveFilter(value);
        setPage(1);
    };

    const changeSearch = (value) => {
        setSearch(value);
        setPage(1);
    };

    const clearFilters = () => {
        setActiveFilter("all");
        setSearch("");
        setPage(1);
    };

    return (
        <div className="customer-orders-page">
            {/* Page Heading */}
            <div className="customer-orders-heading">
                <div>
                    <span className="customer-orders-eyebrow">ORDER HISTORY</span>

                    <h2>My Orders</h2>

                    {isDemo && (
                        <span className="customer-orders-demo-label">
                            <i className="fa-solid fa-flask" aria-hidden="true" />
                            Demo Preview — Sample orders, not real purchases
                        </span>
                    )}

                    <p>View your purchases, track delivery progress and manage your orders.</p>
                </div>

                <span className="customer-orders-heading-icon">
                    <i className="fa-solid fa-boxes-stacked" aria-hidden="true" />
                </span>
            </div>

            {/* Order Overview */}
            <div className="customer-orders-overview">
                <div className="customer-orders-stat">
                    <span className="customer-orders-stat-icon">
                        <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                    </span>

                    <div>
                        <span>Total Orders</span>

                        <strong>{hasData ? counts.all : "—"}</strong>
                    </div>
                </div>

                <div className="customer-orders-stat">
                    <span className="customer-orders-stat-icon is-progress">
                        <i className="fa-solid fa-truck-fast" aria-hidden="true" />
                    </span>

                    <div>
                        <span>In Progress</span>

                        <strong>{hasData ? counts.progress : "—"}</strong>
                    </div>
                </div>

                <div className="customer-orders-stat">
                    <span className="customer-orders-stat-icon is-delivered">
                        <i className="fa-solid fa-circle-check" aria-hidden="true" />
                    </span>

                    <div>
                        <span>Delivered</span>

                        <strong>{hasData ? counts.delivered : "—"}</strong>
                    </div>
                </div>
            </div>

            {/* Orders Panel */}
            <section className="customer-orders-panel">
                <div className="customer-orders-panel-heading">
                    <div>
                        <h3>Your Purchases</h3>

                        <p>Find an order or filter by delivery status.</p>
                    </div>

                    <span>
                        <i className="fa-solid fa-receipt" aria-hidden="true" />
                    </span>
                </div>

                {/* Filters & Search */}
                <div className="customer-orders-toolbar">
                    <div className="customer-orders-filters" role="group" aria-label="Order status filters">
                        {statusFilters.map((filter) => (
                            <button
                                key={filter.value}
                                type="button"
                                className={activeFilter === filter.value ? "is-active" : ""}
                                disabled={!hasData || loading}
                                aria-pressed={activeFilter === filter.value}
                                onClick={() => changeFilter(filter.value)}
                            >
                                {filter.label}

                                {hasData && <span>{counts[filter.value]}</span>}
                            </button>
                        ))}
                    </div>

                    <label className="customer-orders-search">
                        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />

                        <input
                            type="search"
                            value={search}
                            onChange={(event) => changeSearch(event.target.value)}
                            placeholder="Search orders..."
                            aria-label="Search orders"
                            disabled={!hasData || loading}
                        />
                    </label>
                </div>

                {/* Orders Content */}
                <div className="customer-orders-results">
                    {loading ? (
                        <div className="customer-orders-empty" role="status">
                            <span className="customer-orders-empty-icon">
                                <i className="fa-solid fa-spinner fa-spin" />
                            </span>

                            <h3>Loading your orders</h3>

                            <p>Retrieving your order information.</p>
                        </div>
                    ) : error ? (
                        <div className="customer-orders-empty" role="alert">
                            <span className="customer-orders-empty-icon">
                                <i className="fa-solid fa-circle-exclamation" />
                            </span>

                            <h3>Unable to load orders</h3>

                            <p>{error}</p>

                            {typeof onRetry === "function" && (
                                <button
                                    type="button"
                                    onClick={onRetry}
                                    className="customer-orders-empty-button"
                                >
                                    Try Again
                                </button>
                            )}
                        </div>
                    ) : !hasData ? (
                        <div className="customer-orders-empty">
                            <span className="customer-orders-empty-icon">
                                <i className="fa-solid fa-box-open" />
                            </span>

                            <h3>Your order history will appear here</h3>

                            <p>
                                Your purchases and delivery updates will be displayed after account
                                integration is completed.
                            </p>

                            <Link to="/products" className="customer-orders-empty-button">
                                Explore Products
                                <i className="fa-solid fa-arrow-right" />
                            </Link>
                        </div>
                    ) : orderList.length === 0 ? (
                        <div className="customer-orders-empty">
                            <span className="customer-orders-empty-icon">
                                <i className="fa-solid fa-bag-shopping" />
                            </span>

                            <h3>No orders yet</h3>

                            <p>You haven't placed an order yet. Explore our products to get started.</p>

                            <Link to="/products" className="customer-orders-empty-button">
                                Start Shopping
                                <i className="fa-solid fa-arrow-right" />
                            </Link>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="customer-orders-empty">
                            <span className="customer-orders-empty-icon">
                                <i className="fa-solid fa-magnifying-glass" />
                            </span>

                            <h3>No matching orders</h3>

                            <p>Try another search or change your filter.</p>

                            <button
                                type="button"
                                className="customer-orders-empty-button"
                                onClick={clearFilters}
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Orders List */}
                            <div className="customer-orders-list">
                                {visibleOrders.map((order, index) => {
                                    const orderId = getOrderId(order);
                                    const status = getStatus(order);
                                    const statusGroup = getStatusGroup(status);
                                    const deliveryInfo = getDeliveryInfo(order);

                                    const items = Array.isArray(order.items) ? order.items : [];

                                    const firstItem = items[0];

                                    return (
                                        <article key={orderId || index} className="customer-order-card">
                                            {/* Order Header */}
                                            <div className="customer-order-card-top">
                                                <div>
                                                    <span>ORDER ID</span>

                                                    <strong title={orderId}>
                                                        {orderId || "Unavailable"}
                                                    </strong>
                                                </div>

                                                <span className={`customer-order-status is-${statusGroup}`}>
                                                    <i className="fa-solid fa-circle" aria-hidden="true" />

                                                    {formatStatus(status)}
                                                </span>
                                            </div>

                                            {/* Order Body */}
                                            <div className="customer-order-card-body">
                                                <div className="customer-order-product">
                                                    {firstItem ? (
                                                        <OrderThumbnail item={firstItem} />
                                                    ) : (
                                                        <div className="customer-order-product-image">
                                                            <i
                                                                className="fa-solid fa-box-open"
                                                                aria-hidden="true"
                                                            />
                                                        </div>
                                                    )}

                                                    <div>
                                                        <h4>
                                                            {firstItem
                                                                ? getProductName(firstItem)
                                                                : "Order Products"}
                                                        </h4>

                                                        <p>
                                                            {items.length}{" "}
                                                            {items.length === 1 ? "item" : "items"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Order Date, Amount & Delivery */}
                                                <div className="customer-order-meta">
                                                    <div>
                                                        <span>Order Date</span>

                                                        <strong>{formatDate(order.createdAt)}</strong>
                                                    </div>

                                                    <div>
                                                        <span>Total Amount</span>

                                                        <strong className="customer-order-amount">
                                                            {formatAmount(getOrderTotal(order))}
                                                        </strong>
                                                    </div>

                                                    <div className="customer-order-delivery">
                                                        <span>{deliveryInfo.label}</span>

                                                        <strong
                                                            className={`customer-order-delivery-date is-${deliveryInfo.type}`}
                                                        >
                                                            {deliveryInfo.value}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Order Footer */}
                                            <div className="customer-order-card-bottom">
                                                <span>
                                                    <i
                                                        className="fa-solid fa-shield-halved"
                                                        aria-hidden="true"
                                                    />
                                                    Order information
                                                </span>

                                                {orderId && (
                                                    <Link
                                                        to={`/account/orders/${encodeURIComponent(orderId)}`}
                                                    >
                                                        View Details
                                                        <i
                                                            className="fa-solid fa-arrow-right"
                                                            aria-hidden="true"
                                                        />
                                                    </Link>
                                                )}
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="customer-orders-pagination">
                                    <span>
                                        Page {currentPage} of {totalPages}
                                    </span>

                                    <div>
                                        <button
                                            type="button"
                                            disabled={currentPage === 1}
                                            onClick={() => setPage(currentPage - 1)}
                                            aria-label="Previous page"
                                        >
                                            <i className="fa-solid fa-chevron-left" aria-hidden="true" />
                                        </button>

                                        <button
                                            type="button"
                                            disabled={currentPage === totalPages}
                                            onClick={() => setPage(currentPage + 1)}
                                            aria-label="Next page"
                                        >
                                            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* Support Information */}
            <div className="customer-orders-support">
                <span>
                    <i className="fa-solid fa-headset" aria-hidden="true" />
                </span>

                <div>
                    <h3>Need help with an order?</h3>

                    <p>For delivery, payment or product-related issues, contact our support team.</p>
                </div>

                <Link to="/account/complaints">
                    My Complaints
                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
            </div>
        </div>
    );
}

export default MyOrders;
