
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@mui/material";
import { toast } from "react-toastify";

import ReviewForm from "../components/ReviewForm";
import { SHOW_DEMO_ORDERS, demoOrders } from "./MyOrders";
import InvoiceDownload from "../components/InvoiceDownload";

// ================== DEMO INFORMATION ==================
const demoAddress = {
    name: "Demo Customer",
    phone: "98******21",
    house: "Flat 204, Sample Residency",
    area: "Demo Street",
    city: "Bhubaneswar",
    state: "Odisha",
    pincode: "751001",
};

const demoEventTimestamps = {
    "ZUP-20261103-1001": {
        confirmedAt: "2026-11-03T10:45:00+05:30",
        packedAt: "2026-11-03T15:00:00+05:30",
        shippedAt: "2026-11-03T18:30:00+05:30",
        outForDeliveryAt: "2026-11-04T09:10:00+05:30",
    },
    "ZUP-20261102-1002": {
        confirmedAt: "2026-11-02T14:30:00+05:30",
        packedAt: "2026-11-02T17:00:00+05:30",
        shippedAt: "2026-11-03T07:45:00+05:30",
        outForDeliveryAt: "2026-11-03T09:30:00+05:30",
        deliveredAt: "2026-11-03T12:10:00+05:30",
    },
    "ZUP-20261030-1003": {
        confirmedAt: "2026-10-30T11:35:00+05:30",
        packedAt: "2026-10-30T14:45:00+05:30",
        shippedAt: "2026-10-31T10:20:00+05:30",
    },
    "ZUP-20261028-1004": {
        cancelledAt: "2026-10-28T10:05:00+05:30",
    },
    "ZUP-20261024-1005": {
        confirmedAt: "2026-10-24T16:20:00+05:30",
        packedAt: "2026-10-25T11:20:00+05:30",
        shippedAt: "2026-10-25T16:40:00+05:30",
        outForDeliveryAt: "2026-10-27T09:05:00+05:30",
        deliveredAt: "2026-10-27T14:15:00+05:30",
    },
    "ZUP-20261020-1006": {
        confirmedAt: "2026-10-20T12:25:00+05:30",
    },
    "ZUP-20261015-1007": {
        confirmedAt: "2026-10-15T18:00:00+05:30",
        packedAt: "2026-10-16T10:30:00+05:30",
        shippedAt: "2026-10-16T18:20:00+05:30",
        outForDeliveryAt: "2026-10-18T09:30:00+05:30",
        deliveredAt: "2026-10-18T13:50:00+05:30",
    },
};

const demoParcels = {
    "ZUP-20261103-1001": [
        {
            id: "PKG-1001-A",
            status: "out_for_delivery",
            itemIndexes: [0],
            expectedDeliveryAt: "2026-11-05",
            deliveryOtp: "482916",
            eventTimestamps: {
                confirmedAt: "2026-11-03T10:45:00+05:30",
                packedAt: "2026-11-03T15:00:00+05:30",
                shippedAt: "2026-11-03T18:30:00+05:30",
                outForDeliveryAt: "2026-11-04T09:10:00+05:30",
            },
        },
        {
            id: "PKG-1001-B",
            status: "shipped",
            itemIndexes: [1],
            expectedDeliveryAt: "2026-11-07",
            eventTimestamps: {
                confirmedAt: "2026-11-03T11:00:00+05:30",
                packedAt: "2026-11-04T12:30:00+05:30",
                shippedAt: "2026-11-04T17:15:00+05:30",
            },
        },
    ],
};

const moneyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
});

const trackingSteps = [
    {
        key: "placed",
        label: "Order Placed",
        description: "Your order has been placed.",
        dateKey: "createdAt",
    },
    {
        key: "confirmed",
        label: "Order Confirmed",
        description: "Your order has been confirmed.",
        dateKey: "confirmedAt",
    },
    {
        key: "packed",
        label: "Packed",
        description: "Your items are prepared for delivery.",
        dateKey: "packedAt",
    },
    {
        key: "shipped",
        label: "Shipped",
        description: "Your package is on its way.",
        dateKey: "shippedAt",
    },
    {
        key: "out_for_delivery",
        label: "Out for Delivery",
        description: "Your package is on the final delivery route.",
        dateKey: "outForDeliveryAt",
    },
    {
        key: "delivered",
        label: "Delivered",
        description: "Your package has been delivered.",
        dateKey: "deliveredAt",
    },
];

const statusProgress = {
    placed: 0,
    confirmed: 1,
    processing: 1,
    packing: 1,
    packed: 2,
    ready_for_pickup: 2,
    picked_up: 3,
    shipped: 3,
    in_transit: 3,
    out_for_delivery: 4,
    delivered: 5,
};

const cancellableStatuses = new Set([
    "placed",
    "confirmed",
    "processing",
    "packing",
    "packed",
    "ready_for_pickup",
]);

// ================== ORDER HELPERS ==================
function getOrderId(order) {
    return String(order?._id || order?.id || "");
}

function normalizeStatus(status) {
    return String(status || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}

function getOrderStatus(order) {
    return normalizeStatus(
        order?.orderStatus || order?.status
    );
}

function getStatusLabel(status) {
    if (!status) return "Status Unavailable";

    return status
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusCategory(status) {
    if (status === "delivered") return "delivered";

    if (status.includes("cancel") || status.includes("refund")) {
        return "cancelled";
    }

    if (
        Object.hasOwn(statusProgress, status) ||
        ["in_progress", "partially_delivered"].includes(status)
    ) {
        return "progress";
    }

    return "other";
}

function formatDate(value) {
    if (!value) return "Unavailable";

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            return "Unavailable";
        }

        return new Intl.DateTimeFormat("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).format(date);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Unavailable";
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
    }).format(date);
}

function formatDateTime(value, isDemo = false) {
    if (!value) return null;

    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return null;
    }

    let timestamp = value;

    if (
        isDemo &&
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)
    ) {
        timestamp = `${value}+05:30`;
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    }).format(date);
}

function formatMoney(amount) {
    if (
        amount === null ||
        amount === undefined ||
        amount === ""
    ) {
        return "—";
    }

    const value = Number(amount);

    return Number.isFinite(value)
        ? moneyFormatter.format(value)
        : "—";
}

function getProductName(item) {
    return (
        item?.productSnapshot?.name ||
        item?.product?.name ||
        item?.productName ||
        item?.name ||
        item?.title ||
        "Product"
    );
}

function getProductImage(item) {
    const image =
        item?.productSnapshot?.image ||
        item?.product?.images?.[0] ||
        item?.product?.image ||
        item?.image;

    return typeof image === "string"
        ? image
        : image?.url || image?.secure_url || "";
}

function getOrderTotal(order) {
    return (
        order?.totalAmount ??
        order?.total ??
        order?.pricing?.grandTotal ??
        null
    );
}

function getItemId(item) {
    return String(
        item?.orderItemId ||
        item?._id ||
        item?.id ||
        ""
    );
}

// ================== PARCEL HELPERS ==================
function getParcelId(parcel, index) {
    return String(
        parcel?._id ||
        parcel?.id ||
        parcel?.parcelId ||
        `package-${index + 1}`
    );
}

function getParcelStatus(parcel, fallbackStatus = "") {
    return normalizeStatus(
        parcel?.deliveryStatus ||
        parcel?.status ||
        parcel?.orderStatus ||
        fallbackStatus
    );
}

function getParcelItems(parcel, orderItems, totalParcels) {
    if (Array.isArray(parcel.itemIndexes)) {
        return parcel.itemIndexes
            .map((index) => orderItems[index])
            .filter(Boolean);
    }

    if (Array.isArray(parcel.items)) {
        const directItems = parcel.items.filter(
            (item) => item && typeof item === "object"
        );

        if (directItems.length) return directItems;

        return orderItems.filter((item) =>
            parcel.items.some(
                (itemId) =>
                    String(itemId) === getItemId(item)
            )
        );
    }

    if (Array.isArray(parcel.itemIds)) {
        return orderItems.filter((item) =>
            parcel.itemIds.some(
                (itemId) =>
                    String(itemId) === getItemId(item)
            )
        );
    }

    const parcelId = String(
        parcel._id || parcel.id || parcel.parcelId || ""
    );

    if (parcelId) {
        const matchingItems = orderItems.filter(
            (item) => String(item.parcelId || "") === parcelId
        );

        if (matchingItems.length) return matchingItems;
    }

    return totalParcels === 1 ? orderItems : [];
}

function buildOrderParcels(order, isDemo) {
    if (!order) return [];

    const orderId = getOrderId(order);
    const orderItems = Array.isArray(order.items)
        ? order.items
        : [];

    const orderStatus = getOrderStatus(order);

    const sampleParcels = isDemo
        ? demoParcels[orderId]
        : null;

    const existingParcels =
        Array.isArray(order.parcels) && order.parcels.length
            ? order.parcels
            : null;

    const sourceParcels = sampleParcels || existingParcels;

    if (!sourceParcels) {
        return [
            {
                ...order,
                id: `${orderId}-package-1`,
                status: orderStatus,
                items: orderItems,
                isFallback: true,
            },
        ];
    }

    return sourceParcels.map((parcel, index) => ({
        ...parcel,
        id: getParcelId(parcel, index),
        status: getParcelStatus(parcel, orderStatus),
        items: getParcelItems(
            parcel,
            orderItems,
            sourceParcels.length
        ),
    }));
}

function getOverallStatus(order, parcels) {
    const orderStatus = getOrderStatus(order);

    if (parcels.length < 2) return orderStatus;

    const statuses = parcels.map((parcel) =>
        getParcelStatus(parcel, orderStatus)
    );

    if (statuses.every((status) => status === "delivered")) {
        return "delivered";
    }

    if (statuses.every((status) => status === "cancelled")) {
        return "cancelled";
    }

    if (statuses.some((status) => status === "delivered")) {
        return "partially_delivered";
    }

    if (new Set(statuses).size > 1) {
        return "in_progress";
    }

    return orderStatus || statuses[0];
}

function getDeliveryInfo(parcel, status, order = null) {
    if (getStatusCategory(status) === "cancelled") {
        return {
            label: "Delivery",
            value: "Cancelled",
            type: "cancelled",
        };
    }

    if (status === "delivered") {
        const deliveredAt =
            parcel.deliveredAt ??
            parcel.delivery?.deliveredAt ??
            order?.deliveredAt ??
            order?.deliveryDate;

        return {
            label: "Delivered On",
            value: deliveredAt
                ? formatDate(deliveredAt)
                : "Date unavailable",
            type: "delivered",
        };
    }

    const expectedAt =
        parcel.expectedDeliveryAt ??
        parcel.expectedDeliveryDate ??
        parcel.estimatedDeliveryAt ??
        parcel.delivery?.expectedDeliveryAt ??
        order?.expectedDeliveryAt ??
        order?.expectedDeliveryDate;

    return {
        label: "Expected Delivery",
        value: expectedAt
            ? formatDate(expectedAt)
            : "Awaiting estimate",
        type: "expected",
    };
}

function getStepTimestamp(parcel, order, step, isDemo) {
    const sampleTimestamp = isDemo
        ? parcel.eventTimestamps?.[step.dateKey]
        : null;

    if (sampleTimestamp) return sampleTimestamp;

    if (isDemo && parcel.isFallback) {
        const timestamp =
            demoEventTimestamps[getOrderId(order)]?.[step.dateKey];

        if (timestamp) return timestamp;
    }

    const directTimestamp =
        parcel[step.dateKey] ||
        parcel.delivery?.[step.dateKey] ||
        (step.key === "placed" ? order.createdAt : null);

    if (formatDateTime(directTimestamp, isDemo)) {
        return directTimestamp;
    }

    const history = Array.isArray(parcel.statusHistory)
        ? parcel.statusHistory
        : Array.isArray(parcel.trackingHistory)
            ? parcel.trackingHistory
            : parcel.isFallback &&
                Array.isArray(order.statusHistory)
                ? order.statusHistory
                : [];

    const matchingStatuses = {
        placed: ["placed", "order_placed"],
        confirmed: ["confirmed"],
        packed: ["packed", "ready_for_pickup"],
        shipped: ["shipped", "picked_up", "in_transit"],
        out_for_delivery: ["out_for_delivery"],
        delivered: ["delivered"],
        cancelled: ["cancelled"],
    };

    const matches = matchingStatuses[step.key] || [step.key];

    const event = [...history].reverse().find((entry) =>
        matches.includes(
            normalizeStatus(entry.status || entry.key)
        )
    );

    const eventTimestamp =
        event?.at ||
        event?.timestamp ||
        event?.createdAt;

    return formatDateTime(eventTimestamp, isDemo)
        ? eventTimestamp
        : null;
}

function getParcelOtp(parcel) {
    return (
        parcel.deliveryOtp ||
        parcel.delivery?.otp ||
        null
    );
}

// ================== PRODUCT IMAGE ==================
function OrderItemImage({ item }) {
    const image = getProductImage(item);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [image]);

    return (
        <div className="customer-detail-product-image">
            {image && !failed ? (
                <img
                    src={image}
                    alt={getProductName(item)}
                    loading="lazy"
                    onError={() => setFailed(true)}
                />
            ) : (
                <i
                    className="fa-solid fa-box-open"
                    aria-hidden="true"
                />
            )}
        </div>
    );
}

// ================== PARCEL TRACKING ==================
function ParcelTimeline({ parcel, order, isDemo }) {
    const status = getParcelStatus(parcel);
    const isCancelled = getStatusCategory(status) === "cancelled";
    const currentStep = statusProgress[status] ?? -1;

    const visibleSteps = isCancelled
        ? [
            trackingSteps[0],
            {
                key: "cancelled",
                label: "Order Cancelled",
                description: "This package has been cancelled.",
                dateKey: "cancelledAt",
            },
        ]
        : trackingSteps;

    return (
        <div className="customer-detail-tracking">
            {visibleSteps.map((step, index) => {
                const isCompleted = isCancelled
                    ? true
                    : index <= currentStep;

                const isCurrent = isCancelled
                    ? index === visibleSteps.length - 1
                    : index === currentStep &&
                      status !== "delivered";

                const timestamp = getStepTimestamp(
                    parcel,
                    order,
                    step,
                    isDemo
                );

                const formattedTimestamp = isCompleted
                    ? formatDateTime(timestamp, isDemo)
                    : null;

                return (
                    <div
                        key={step.key}
                        className={`customer-detail-step ${
                            isCompleted ? "is-completed" : ""
                        } ${
                            isCurrent ? "is-current" : ""
                        } ${
                            step.key === "cancelled"
                                ? "is-cancelled"
                                : ""
                        }`}
                    >
                        <div className="customer-detail-step-marker">
                            <span>
                                {isCompleted ? (
                                    <i
                                        className={`fa-solid ${
                                            step.key === "cancelled"
                                                ? "fa-xmark"
                                                : "fa-check"
                                        }`}
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <i
                                        className="fa-solid fa-circle"
                                        aria-hidden="true"
                                    />
                                )}
                            </span>
                        </div>

                        <div className="customer-detail-step-content">
                            <div>
                                <h4>{step.label}</h4>

                                {formattedTimestamp ? (
                                    <time>
                                        {formattedTimestamp}
                                    </time>
                                ) : (
                                    <span className="customer-detail-step-time">
                                        {isCompleted
                                            ? "Time not recorded"
                                            : "Pending"}
                                    </span>
                                )}
                            </div>

                            <p>{step.description}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ================== DELIVERY OTP ==================
function ParcelDeliveryOtp({
    otp,
    visible,
    onToggle,
    isDemo,
}) {
    return (
        <div className="customer-detail-otp-card">
            <div className="customer-detail-otp-heading">
                <span>
                    <i
                        className="fa-solid fa-shield-halved"
                        aria-hidden="true"
                    />
                </span>

                <div>
                    <h3>Delivery Verification</h3>
                    <p>One-time delivery code</p>
                </div>
            </div>

            <div className="customer-detail-otp-value">
                <strong>
                    {visible ? otp : "••••••"}
                </strong>

                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={
                        visible
                            ? "Hide delivery OTP"
                            : "Show delivery OTP"
                    }
                >
                    <i
                        className={`fa-solid ${
                            visible ? "fa-eye-slash" : "fa-eye"
                        }`}
                        aria-hidden="true"
                    />
                </button>
            </div>

            <p>
                Share this code only with the delivery agent
                when this package reaches your doorstep.
            </p>

            {isDemo && (
                <small>
                    Sample OTP for design preview only.
                </small>
            )}
        </div>
    );
}

// ================== ORDER DETAILS ==================
function OrderDetails({
    order = null,
    orders = null,
    loading = false,
    error = "",
    onRetry,
    onCancel,
    onRequestReplacement,
    onSubmitReview,
    onDownloadInvoice,
}) {
    const { orderId } = useParams();

    const [visibleOtps, setVisibleOtps] = useState({});
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [reviewItem, setReviewItem] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const hasRealData =
        Boolean(order) || Array.isArray(orders);

    const isDemo =
        SHOW_DEMO_ORDERS && !hasRealData;

    // ================== SELECT ORDER ==================
    const realOrder =
        order && getOrderId(order) === orderId
            ? order
            : Array.isArray(orders)
                ? orders.find(
                    (item) => getOrderId(item) === orderId
                )
                : null;

    const sampleOrder = isDemo
        ? demoOrders.find(
            (item) => getOrderId(item) === orderId
        )
        : null;

    const selectedOrder = realOrder || sampleOrder || null;

    const items = Array.isArray(selectedOrder?.items)
        ? selectedOrder.items
        : [];

    const parcels = buildOrderParcels(selectedOrder, isDemo);

    const status = getOverallStatus(selectedOrder, parcels);
    const statusCategory = getStatusCategory(status);

    const orderDeliveryInfo =
        selectedOrder && parcels.length > 1
            ? {
                label: "Delivery Schedule",
                value: "See package details",
                type: "expected",
            }
            : selectedOrder && parcels.length === 1
                ? getDeliveryInfo(
                    parcels[0],
                    getParcelStatus(parcels[0]),
                    selectedOrder
                )
                : null;

    const address = selectedOrder
        ? (
            selectedOrder.shippingAddress ||
            selectedOrder.deliveryAddress ||
            (isDemo ? demoAddress : null)
        )
        : null;

    const payment = selectedOrder?.payment || {};

    const paymentMethod =
        payment.method ||
        selectedOrder?.paymentMethod ||
        (isDemo ? "Online Payment" : "");

    const paymentStatus = String(
        payment.status ||
        selectedOrder?.paymentStatus ||
        (isDemo ? "Paid (Demo)" : "")
    );

    const paymentIsPaid = [
        "paid",
        "paid_(demo)",
        "paid_demo",
        "completed",
        "success",
    ].includes(normalizeStatus(paymentStatus));

    const canCancel =
        cancellableStatuses.has(status) &&
        parcels.every((parcel) =>
            cancellableStatuses.has(getParcelStatus(parcel))
        );

    const canReplace =
        status === "delivered" &&
        selectedOrder?.replacementEligible !== false;

    // ================== PRODUCT REVIEW ELIGIBILITY ==================
    const isItemDelivered = (item, itemIndex) => {
        return parcels.some((parcel) => {
            if (getParcelStatus(parcel) !== "delivered") {
                return false;
            }

            // Match the exact item within a delivered package.
            if (
                isDemo &&
                Array.isArray(parcel.itemIndexes) &&
                parcel.itemIndexes.includes(itemIndex)
            ) {
                return true;
            }

            const orderItemId = getItemId(item);

            return parcel.items.some((parcelItem) => {
                if (parcelItem === item) return true;

                const parcelItemId = getItemId(parcelItem);

                return Boolean(orderItemId) &&
                    parcelItemId === orderItemId;
            });
        });
    };

    // ================== RESET PAGE STATE ==================
    useEffect(() => {
        setVisibleOtps({});
        setCancelDialogOpen(false);
        setReviewItem(null);
    }, [orderId]);

    // ================== CANCEL ORDER ==================
    const handleCancelOrder = async () => {
        if (isDemo || typeof onCancel !== "function") {
            setCancelDialogOpen(false);

            toast.info(
                "Order cancellation is not available in this preview."
            );

            return;
        }

        try {
            setSubmitting(true);

            const result = await onCancel(selectedOrder);

            if (result?.success !== true) {
                toast.error(
                    result?.message ||
                    "Order cancellation could not be confirmed."
                );

                return;
            }

            setCancelDialogOpen(false);

            toast.success(
                "Order cancellation request processed."
            );
        } catch {
            toast.error(
                "Unable to cancel the order. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // ================== REPLACEMENT REQUEST ==================
    const handleReplacement = async () => {
        if (
            isDemo ||
            typeof onRequestReplacement !== "function"
        ) {
            toast.info(
                "Replacement requests will be available after backend integration."
            );

            return;
        }

        try {
            setSubmitting(true);

            const result = await onRequestReplacement(
                selectedOrder
            );

            if (result?.success !== true) {
                toast.error(
                    result?.message ||
                    "Replacement request could not be confirmed."
                );

                return;
            }

            toast.success(
                "Replacement request submitted."
            );
        } catch {
            toast.error(
                "Unable to submit replacement request. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    // ================== LOADING / ERROR ==================
    if (loading || error || !selectedOrder) {
        return (
            <div className="customer-order-detail-page">
                <Link
                    to="/account/orders"
                    className="customer-detail-back"
                >
                    <i
                        className="fa-solid fa-arrow-left"
                        aria-hidden="true"
                    />

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

                    {!loading &&
                        error &&
                        typeof onRetry === "function" && (
                            <button
                                type="button"
                                className="customer-detail-primary-button"
                                onClick={onRetry}
                            >
                                Try Again
                            </button>
                        )}
                </div>
            </div>
        );
    }

    // ================== PAYMENT SUMMARY ==================
    const totalAmount = getOrderTotal(selectedOrder);
    const pricing = selectedOrder.pricing || {};

    const summaryRows = [
        {
            label: "Subtotal",
            value:
                pricing.subtotal ??
                selectedOrder.subtotal,
        },
        {
            label: "Delivery Fee",
            value:
                pricing.shippingFee ??
                selectedOrder.shippingFee,
        },
        {
            label: "Discount",
            value:
                pricing.discount ??
                selectedOrder.discount,
            discount: true,
        },
    ].filter(
        (row) =>
            row.value !== undefined &&
            row.value !== null
    );

    return (
        <div className="customer-order-detail-page">

            {/* Back Navigation */}
            <Link
                to="/account/orders"
                className="customer-detail-back"
            >
                <i
                    className="fa-solid fa-arrow-left"
                    aria-hidden="true"
                />

                Back to My Orders
            </Link>

            {/* Page Heading */}
            <div className="customer-detail-heading">
                <div>
                    <span className="customer-detail-eyebrow">
                        ORDER INFORMATION
                    </span>

                    <h2>Order Details</h2>

                    <p>
                        Review your order items, payment
                        and delivery information.
                    </p>

                    {isDemo && (
                        <span className="customer-detail-demo-label">
                            <i
                                className="fa-solid fa-flask"
                                aria-hidden="true"
                            />

                            Demo Preview — Sample order
                        </span>
                    )}
                </div>

                <span className="customer-detail-heading-icon">
                    <i
                        className="fa-solid fa-receipt"
                        aria-hidden="true"
                    />
                </span>
            </div>

            {/* Order Overview */}
            <div className="customer-detail-overview">
                <div className="customer-detail-overview-top">
                    <div>
                        <span>ORDER ID</span>
                        <strong>{orderId}</strong>
                    </div>

                    <span
                        className={`customer-detail-status is-${statusCategory}`}
                    >
                        <i
                            className="fa-solid fa-circle"
                            aria-hidden="true"
                        />

                        {getStatusLabel(status)}
                    </span>
                </div>

                <div className="customer-detail-overview-info">
                    <div>
                        <span>Order Placed</span>

                        <strong>
                            {formatDate(selectedOrder.createdAt)}
                        </strong>
                    </div>

                    <div>
                        <span>{orderDeliveryInfo.label}</span>

                        <strong
                            className={`customer-detail-date is-${orderDeliveryInfo.type}`}
                        >
                            {orderDeliveryInfo.value}
                        </strong>
                    </div>

                    <div>
                        <span>Order Total</span>

                        <strong className="customer-detail-total">
                            {formatMoney(totalAmount)}
                        </strong>
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
                                <i
                                    className="fa-solid fa-box"
                                    aria-hidden="true"
                                />
                            </span>

                            <div>
                                <h3>Order Items</h3>

                                <p>
                                    {items.length}{" "}
                                    {items.length === 1
                                        ? "item"
                                        : "items"}{" "}
                                    in this order
                                </p>
                            </div>
                        </div>

                        <div className="customer-detail-items">
                            {items.length ? (
                                items.map((item, index) => {
                                    const price =
                                        item.unitPrice ??
                                        item.price ??
                                        item.productSnapshot?.price;

                                    const quantity =
                                        Number(item.quantity) || 1;

                                    const delivered =
                                        isItemDelivered(item, index);

                                    return (
                                        <div
                                            className="customer-detail-item"
                                            key={
                                                getItemId(item) || index
                                            }
                                        >
                                            <OrderItemImage item={item} />

                                            <div className="customer-detail-item-info">
                                                <h4>
                                                    {getProductName(item)}
                                                </h4>

                                                {item.variantName && (
                                                    <p>
                                                        {item.variantName}
                                                    </p>
                                                )}

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

                                            {price !== undefined &&
                                                price !== null && (
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
                                <i
                                    className="fa-solid fa-truck-fast"
                                    aria-hidden="true"
                                />
                            </span>

                            <div>
                                <h3>Delivery Tracking</h3>

                                <p>
                                    {parcels.length}{" "}
                                    {parcels.length === 1
                                        ? "package"
                                        : "packages"}{" "}
                                    in this order
                                </p>
                            </div>
                        </div>

                        <div className="customer-detail-parcels">
                            {parcels.map((parcel, index) => {
                                const parcelStatus =
                                    getParcelStatus(parcel, status);

                                const parcelCategory =
                                    getStatusCategory(parcelStatus);

                                const deliveryInfo =
                                    getDeliveryInfo(
                                        parcel,
                                        parcelStatus,
                                        parcels.length === 1
                                            ? selectedOrder
                                            : null
                                    );

                                const parcelItems =
                                    Array.isArray(parcel.items)
                                        ? parcel.items
                                        : [];

                                const otp = getParcelOtp(parcel);

                                const canViewOtp =
                                    parcelStatus === "out_for_delivery" &&
                                    Boolean(otp) &&
                                    !parcel.otpVerified &&
                                    !parcel.delivery?.otpVerified;

                                return (
                                    <article
                                        key={parcel.id}
                                        className="customer-detail-parcel"
                                    >
                                        {/* Package Heading */}
                                        <div className="customer-detail-parcel-heading">
                                            <div className="customer-detail-parcel-title">
                                                <span>
                                                    <i
                                                        className="fa-solid fa-box"
                                                        aria-hidden="true"
                                                    />
                                                </span>

                                                <div>
                                                    <h4>
                                                        Package {index + 1}
                                                    </h4>

                                                    <p title={parcel.id}>
                                                        {parcel.id}
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={`customer-detail-status is-${parcelCategory}`}
                                            >
                                                <i
                                                    className="fa-solid fa-circle"
                                                    aria-hidden="true"
                                                />

                                                {getStatusLabel(parcelStatus)}
                                            </span>
                                        </div>

                                        {/* Package Summary */}
                                        <div className="customer-detail-parcel-summary">
                                            <div>
                                                <span>
                                                    {deliveryInfo.label}
                                                </span>

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
                                                        ? parcelItems
                                                            .map(getProductName)
                                                            .join(", ")
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
                                                    visible={Boolean(
                                                        visibleOtps[parcel.id]
                                                    )}
                                                    onToggle={() =>
                                                        setVisibleOtps(
                                                            (previous) => ({
                                                                ...previous,
                                                                [parcel.id]:
                                                                    !previous[parcel.id],
                                                            })
                                                        )
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

                                <p>
                                    Manage available actions
                                    for this order.
                                </p>
                            </div>

                            {canCancel && (
                                <button
                                    type="button"
                                    className="customer-detail-cancel-button"
                                    onClick={() =>
                                        setCancelDialogOpen(true)
                                    }
                                    disabled={submitting}
                                >
                                    <i
                                        className="fa-solid fa-ban"
                                        aria-hidden="true"
                                    />

                                    Cancel Order
                                </button>
                            )}

                            {canReplace && (
                                <button
                                    type="button"
                                    className="customer-detail-replace-button"
                                    onClick={handleReplacement}
                                    disabled={submitting}
                                >
                                    <i
                                        className="fa-solid fa-rotate"
                                        aria-hidden="true"
                                    />

                                    Request Replacement
                                </button>
                            )}
                        </section>
                    )}
                </div>

                {/* Right Column */}
                <aside className="customer-detail-side">

                    {/* Delivery Address */}
                    <section className="customer-detail-card">
                        <div className="customer-detail-card-heading">
                            <span className="customer-detail-card-icon">
                                <i
                                    className="fa-solid fa-location-dot"
                                    aria-hidden="true"
                                />
                            </span>

                            <div>
                                <h3>Delivery Address</h3>
                                <p>Order destination</p>
                            </div>
                        </div>

                        <div className="customer-detail-address">
                            {address ? (
                                <>
                                    <strong>
                                        {address.name || "Customer"}
                                    </strong>

                                    <p>
                                        {[
                                            address.house,
                                            address.area,
                                            address.landmark,
                                        ]
                                            .filter(Boolean)
                                            .join(", ")}
                                    </p>

                                    <p>
                                        {[
                                            address.city,
                                            address.state,
                                        ]
                                            .filter(Boolean)
                                            .join(", ")}
                                        {address.pincode
                                            ? ` - ${address.pincode}`
                                            : ""}
                                    </p>

                                    {address.phone && (
                                        <span>
                                            <i
                                                className="fa-solid fa-phone"
                                                aria-hidden="true"
                                            />

                                            {address.phone}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <p className="customer-detail-unavailable">
                                    Delivery address unavailable.
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Payment Summary */}
                    <section className="customer-detail-card">
                        <div className="customer-detail-card-heading">
                            <span className="customer-detail-card-icon">
                                <i
                                    className="fa-solid fa-credit-card"
                                    aria-hidden="true"
                                />
                            </span>

                            <div>
                                <h3>Payment Summary</h3>

                                <p>
                                    Order payment information
                                </p>
                            </div>
                        </div>

                        <div className="customer-detail-payment">
                            <div>
                                <span>Payment Method</span>

                                <strong>
                                    {paymentMethod || "Unavailable"}
                                </strong>
                            </div>

                            <div>
                                <span>Payment Status</span>

                                <strong
                                    className={
                                        paymentIsPaid
                                            ? "is-paid"
                                            : ""
                                    }
                                >
                                    {paymentStatus || "Unavailable"}
                                </strong>
                            </div>

                            {summaryRows.length > 0 && (
                                <div className="customer-detail-price-breakdown">
                                    {summaryRows.map((row) => (
                                        <div key={row.label}>
                                            <span>
                                                {row.label}
                                            </span>

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

                                <strong>
                                    {formatMoney(totalAmount)}
                                </strong>
                            </div>
                            {/* Invoice Download */}
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
                            <i
                                className="fa-solid fa-headset"
                                aria-hidden="true"
                            />
                        </span>

                        <div>
                            <h3>Need Help?</h3>

                            <p>
                                Have a question about this order?
                            </p>

                            <Link to="/account/complaints">
                                Contact Support

                                <i
                                    className="fa-solid fa-arrow-right"
                                    aria-hidden="true"
                                />
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

            {/* Cancel Confirmation */}
            <Dialog
                open={cancelDialogOpen}
                onClose={
                    submitting
                        ? undefined
                        : () => setCancelDialogOpen(false)
                }
                fullWidth
                maxWidth="xs"
                className="customer-detail-cancel-dialog"
                aria-labelledby="customer-order-cancel-title"
            >
                <DialogTitle id="customer-order-cancel-title">
                    Cancel Order?
                </DialogTitle>

                <DialogContent>
                    <p>
                        Are you sure you want to cancel this order?
                        Cancellation is subject to its current status
                        and store policy.
                    </p>
                </DialogContent>

                <DialogActions>
                    <button
                        type="button"
                        className="customer-detail-dialog-back"
                        onClick={() =>
                            setCancelDialogOpen(false)
                        }
                        disabled={submitting}
                    >
                        Keep Order
                    </button>

                    <button
                        type="button"
                        className="customer-detail-dialog-confirm"
                        onClick={handleCancelOrder}
                        disabled={submitting}
                    >
                        {submitting
                            ? "Processing..."
                            : "Cancel Order"}
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default OrderDetails;
