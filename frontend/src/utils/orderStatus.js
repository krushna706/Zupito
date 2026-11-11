import formatDate from "./formatDate";
import { getProductPath } from "./productVariants";
export const trackingSteps = [
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
export const statusProgress = {
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
export function getOrderId(order) {
    return String(order?._id || order?.id || "");
}
export function normalizeStatus(status) {
    return String(status || "")
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
}
export function getOrderStatus(order) {
    return normalizeStatus(order?.orderStatus || order?.status);
}
export function getStatusLabel(status) {
    if (!status) return "Status Unavailable";
    return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
export function getStatusCategory(status) {
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
export function formatDateTime(value) {
    if (!value) return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return null;
    }
    const date = new Date(value);
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
export function getProductName(item) {
    return (
        item?.productSnapshot?.name ||
        item?.product?.name ||
        item?.productName ||
        item?.name ||
        item?.title ||
        "Product"
    );
}
export function getProductLink(item) {
    const rawId =
        item?.productId ||
        item?.productSnapshot?.productId ||
        item?.product?._id ||
        item?.product?.id;
    const rawVariant =
        item?.variantId ||
        item?.productSnapshot?.variantId ||
        item?.variant?._id ||
        item?.variant?.id;
    const productId = typeof rawId === "string" ? rawId : rawId?._id || rawId?.id;
    const variantId =
        typeof rawVariant === "string" ? rawVariant : rawVariant?._id || rawVariant?.id || null;
    return productId ? getProductPath(productId, variantId) : null;
}
export function getProductImage(item) {
    const image =
        item?.productSnapshot?.image ||
        item?.product?.images?.[0] ||
        item?.product?.image ||
        item?.image;
    return typeof image === "string" ? image : image?.url || image?.secure_url || "";
}
export function getOrderTotal(order) {
    return order?.totalAmount ?? order?.total ?? order?.pricing?.grandTotal ?? null;
}
export function getItemId(item) {
    return String(item?.orderItemId || item?._id || item?.id || "");
}
export function getParcelId(parcel, index) {
    return String(parcel?._id || parcel?.id || parcel?.parcelId || `package-${index + 1}`);
}
export function getParcelStatus(parcel, fallbackStatus = "") {
    return normalizeStatus(
        parcel?.deliveryStatus || parcel?.status || parcel?.orderStatus || fallbackStatus
    );
}
export function getParcelItems(parcel, orderItems, totalParcels) {
    if (Array.isArray(parcel.itemIndexes)) {
        return parcel.itemIndexes.map((index) => orderItems[index]).filter(Boolean);
    }
    if (Array.isArray(parcel.items)) {
        const directItems = parcel.items.filter((item) => item && typeof item === "object");
        if (directItems.length) return directItems;
        return orderItems.filter((item) =>
            parcel.items.some((itemId) => String(itemId) === getItemId(item))
        );
    }
    if (Array.isArray(parcel.itemIds)) {
        return orderItems.filter((item) =>
            parcel.itemIds.some((itemId) => String(itemId) === getItemId(item))
        );
    }
    const parcelId = String(parcel._id || parcel.id || parcel.parcelId || "");
    if (parcelId) {
        const matchingItems = orderItems.filter((item) => String(item.parcelId || "") === parcelId);
        if (matchingItems.length) return matchingItems;
    }
    return totalParcels === 1 ? orderItems : [];
}
export function buildOrderParcels(order) {
    if (!order) return [];
    const orderId = getOrderId(order);
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const orderStatus = getOrderStatus(order);
    const existingParcels =
        Array.isArray(order.parcels) && order.parcels.length ? order.parcels : null;
    const sourceParcels = existingParcels;
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
        items: getParcelItems(parcel, orderItems, sourceParcels.length),
    }));
}
export function getOverallStatus(order, parcels) {
    const orderStatus = getOrderStatus(order);
    if (!parcels.length) return orderStatus;
    if (parcels.length === 1) {
        return getParcelStatus(parcels[0], orderStatus) || orderStatus;
    }
    const statuses = parcels.map((parcel) => getParcelStatus(parcel, orderStatus));
    if (statuses.every((status) => status === "delivered")) {
        return "delivered";
    }
    if (statuses.every((status) => status === "cancelled")) {
        return "cancelled";
    }
    if (statuses.every((status) => ["delivered", "cancelled"].includes(status))) {
        return statuses.some((status) => status === "delivered") ? "delivered" : "cancelled";
    }
    if (statuses.some((status) => status === "delivered")) {
        return "partially_delivered";
    }
    if (new Set(statuses).size > 1) {
        return "in_progress";
    }
    return statuses[0] || orderStatus;
}
export function getDeliveryInfo(parcel, status, order = null) {
    if (getStatusCategory(status) === "cancelled") {
        return {
            label: "Delivery",
            value: "Cancelled",
            type: "cancelled",
        };
    }
    if (status === "delivered") {
        const deliveredAt =
            parcel.eventTimestamps?.deliveredAt ??
            parcel.deliveredAt ??
            parcel.delivery?.deliveredAt ??
            order?.deliveredAt ??
            order?.deliveryDate;
        return {
            label: "Delivered On",
            value: deliveredAt ? formatDate(deliveredAt) : "Date unavailable",
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
        value: expectedAt ? formatDate(expectedAt) : "Awaiting estimate",
        type: "expected",
    };
}
export function getStepTimestamp(parcel, order, step) {
    const directTimestamp =
        parcel.eventTimestamps?.[step.dateKey] ||
        parcel[step.dateKey] ||
        parcel.delivery?.[step.dateKey] ||
        (step.key === "placed" ? order.createdAt : null);
    if (formatDateTime(directTimestamp)) {
        return directTimestamp;
    }
    const history = Array.isArray(parcel.statusHistory)
        ? parcel.statusHistory
        : Array.isArray(parcel.trackingHistory)
          ? parcel.trackingHistory
          : parcel.isFallback && Array.isArray(order.statusHistory)
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
    const event = [...history]
        .reverse()
        .find((entry) => matches.includes(normalizeStatus(entry.status || entry.key)));
    const eventTimestamp = event?.at || event?.timestamp || event?.createdAt;
    return formatDateTime(eventTimestamp) ? eventTimestamp : null;
}
export function getParcelOtp(parcel) {
    return parcel.deliveryOtp || parcel.delivery?.otp || null;
}
