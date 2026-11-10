
import api from "./api";
import { demoAddress, demoOrders, demoParcels } from "../data/orderPreview";

import {
    ensureStockHistory,
    getProducts,
    getStoreName,
    inventoryRows,
    ownProducts,
    saveProducts,
} from "./sellerService";

// ================== CONFIGURATION ==================
const ORDER_KEY = "zupito_admin_orders";
const TASK_KEY = "zupito_admin_delivery_assignments";
const AGENT_KEY = "zupito_admin_delivery_agents";
const STORE_KEY = "zupito_seller_store_profiles";

// ================== STORAGE HELPERS ==================
function readArray(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : null;
    } catch {
        return null;
    }
}

function defaultOrders() {
    return demoOrders.map((order) => ({
        ...order,
        id: order._id,
        customerName: demoAddress.name,
        address: { ...demoAddress },
        paymentMethod: "Online Payment",
        paymentStatus: "Not Verified (Demo)",
        parcels: (demoParcels[order._id] || [{
            id: `${order._id}-P1`,
            status: order.orderStatus,
            itemIndexes: order.items.map((_, index) => index),
        }]).map((parcel) => ({
            ...parcel,
        })),
        exception: null,
        activity: [],
    }));
}

function readOrders() {
    return readArray(ORDER_KEY) || defaultOrders();
}

function accountMatches(record, user) {
    const sameId = user?.id &&
        String(record?.sellerId) === String(user.id);

    const sameEmail = user?.email &&
        record?.sellerEmail?.toLowerCase() === user.email.toLowerCase();

    return Boolean(sameId || sameEmail);
}

function isPaid(order) {
    if (order.demoPayment === true) return true;
    if (order.paymentVerified === true) return true;

    return ["paid", "captured", "completed", "success"].includes(
        String(order.paymentStatus || "").trim().toLowerCase()
    );
}

function parcelItems(order, parcel) {
    if (Array.isArray(parcel.itemIndexes)) {
        return parcel.itemIndexes
            .map((index) => order.items?.[index])
            .filter(Boolean);
    }

    if (
        Array.isArray(parcel.items) &&
        parcel.items.every((item) => typeof item === "object")
    ) {
        return parcel.items;
    }

    return (order.items || []).filter((item) =>
        accountMatches(item, {
            id: parcel.sellerId,
            email: parcel.sellerEmail,
        })
    );
}

// ================== SELLER ORDER RECORDS ==================
export function getSellerOrders(user) {
    const tasks = readArray(TASK_KEY) || [];
    const agents = readArray(AGENT_KEY) || [];

    return readOrders().flatMap((order) => {
        if (!isPaid(order)) return [];

        return (order.parcels || []).flatMap((parcel) => {
            const items = parcelItems(order, parcel);

            const owned = accountMatches(parcel, user) ||
                items.some((item) => accountMatches(item, user));

            if (!owned) return [];

            const parcelId = String(
                parcel.id || parcel._id || parcel.parcelId || ""
            );

            const task = tasks.find((item) =>
                String(item.parcelId) === parcelId
            );

            const agent = agents.find((item) =>
                item.id === task?.agentId
            );

            const baseStatus = String(
                parcel.status || "confirmed"
            ).toLowerCase();

            const deliveryStages = [
                "assigned",
                "picked_up",
                "out_for_delivery",
                "failed",
                "delivered",
                "cancelled",
            ];

            const status = deliveryStages.includes(task?.stage)
                ? task.stage
                : baseStatus;

            return [{
                ...order,
                orderId: String(order.id || order._id),
                parcelId,
                parcel,
                items: items.filter((item) =>
                    accountMatches(item, user) ||
                    accountMatches(parcel, user)
                ),
                status,
                task,
                agent,
                amount: items.reduce((sum, item) =>
                    sum +
                    Number(item.price ?? item.unitPrice ?? 0) *
                    Number(item.quantity || 0),
                0),
            }];
        });
    }).sort((first, second) =>
        new Date(second.createdAt) - new Date(first.createdAt)
    );
}

export function getSellerOrder(user, orderId, parcelId) {
    return getSellerOrders(user).find((order) =>
        order.orderId === orderId &&
        order.parcelId === parcelId
    ) || null;
}

// ================== DEMO ORDER CREATION ==================
// Demo payments are simulated. Real payment verification happens on the backend.
export function createDemoSellerOrder(user, variantKey, quantity) {
    const units = Number(quantity);
    const inventory = inventoryRows(user);

    const selected = inventory.find((item) =>
        item.key === variantKey
    );

    if (
        !selected ||
        !Number.isSafeInteger(units) ||
        units < 1 ||
        units > selected.available
    ) {
        throw new Error("Select an available variant and a valid quantity.");
    }

    ensureStockHistory(user);

    const products = getProducts();
    const nextProducts = structuredClone(products);

    const product = nextProducts.find((item) =>
        item.id === selected.productId
    );

    const variant = selected.variantId === "base"
        ? product
        : product.variants?.find((item, index) =>
            String(item.id ?? index) === selected.variantId
        );

    if (
        !variant ||
        !ownProducts(user).some((item) => item.id === product.id)
    ) {
        throw new Error(
            "This product is not available for your seller account."
        );
    }

    const reserved = Number(
        variant.reservedStock ??
        variant.reservedQuantity ??
        0
    );

    if (Number(variant.stock) - reserved < units) {
        throw new Error(
            "Not enough available stock for this sample order."
        );
    }

    variant.reservedStock = reserved + units;

    if (variant.reservedQuantity != null) {
        variant.reservedQuantity = reserved + units;
    }

    const now = new Date().toISOString();
    const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
    const orderId = `ZUP-DEMO-${suffix}`;
    const parcelId = `PKG-${suffix}`;
    const store = getStoreName(user);

    const profileKey = String(
        user?.id || user?.email || "seller-demo"
    ).toLowerCase();

    let pickupPincode = "";

    try {
        const profiles = JSON.parse(
            localStorage.getItem(STORE_KEY) || "{}"
        );

        pickupPincode = profiles?.[profileKey]?.pincode || "";
    } catch {
        // Pickup pincode can be configured in Store Profile.
    }

    const item = {
        productId: product.id,
        variantId: selected.variantId,
        sku: selected.sku,
        name: product.name,
        variant: selected.variant,
        image: selected.image,
        price: selected.price,
        quantity: units,
        sellerId: user.id,
        sellerEmail: user.email,
    };

    const order = {
        id: orderId,
        _id: orderId,
        createdAt: now,
        customerName: demoAddress.name,
        address: { ...demoAddress },
        items: [item],
        totalAmount: selected.price * units,
        orderStatus: "confirmed",
        paymentMethod: "Online Payment (Demo)",
        paymentStatus: "Paid (Demo)",
        demoPayment: true,
        paymentVerified: false,
        parcels: [{
            id: parcelId,
            sellerId: user.id,
            sellerEmail: user.email,
            sellerName: store,
            pickupPincode,
            status: "confirmed",
            stockReserved: true,
            itemIndexes: [0],
            eventTimestamps: {
                confirmedAt: now,
            },
        }],
        activity: [{
            type: "confirmed",
            date: now,
            note: "Paid sample order created for frontend testing.",
        }],
        exception: null,
    };

    const previousProducts = localStorage.getItem("zupito_admin_products");
    const previousOrders = localStorage.getItem(ORDER_KEY);

    try {
        saveProducts(nextProducts);

        localStorage.setItem(
            ORDER_KEY,
            JSON.stringify([...readOrders(), order])
        );
    } catch {
        if (previousProducts === null) {
            localStorage.removeItem("zupito_admin_products");
        } else {
            localStorage.setItem(
                "zupito_admin_products",
                previousProducts
            );
        }

        if (previousOrders === null) {
            localStorage.removeItem(ORDER_KEY);
        } else {
            localStorage.setItem(ORDER_KEY, previousOrders);
        }

        throw new Error(
            "Unable to save sample order. Browser storage may be full."
        );
    }

    return orderId;
}

// ================== SELLER FULFILMENT ==================
export function updateSellerOrder(user, orderId, parcelId, action, note = "") {
    const current = getSellerOrder(user, orderId, parcelId);

    if (!current) {
        throw new Error("Seller order not found.");
    }

    const transitions = {
        packing: ["confirmed", "placed", "processing"],
        ready_for_pickup: ["packing"],
    };

    if (!transitions[action]?.includes(current.status)) {
        throw new Error(
            "This status change is not available for the current parcel."
        );
    }

    const orders = readOrders();
    const now = new Date().toISOString();

    const updated = orders.map((order) => {
        if (String(order.id || order._id) !== orderId) {
            return order;
        }

        const parcels = order.parcels.map((parcel) => {
            if (String(parcel.id || parcel._id) !== parcelId) {
                return parcel;
            }

            return {
                ...parcel,
                status: action,
                packedAt: action === "ready_for_pickup"
                    ? now
                    : parcel.packedAt,
                readyAt: action === "ready_for_pickup"
                    ? now
                    : parcel.readyAt,
                eventTimestamps: {
                    ...(parcel.eventTimestamps || {}),
                    [action === "packing"
                        ? "packingAt"
                        : "readyForPickupAt"]: now,
                },
            };
        });

        return {
            ...order,
            parcels,
            orderStatus: parcels.length === 1
                ? action
                : "processing",
            activity: [
                ...(order.activity || []),
                {
                    type: action,
                    date: now,
                    parcelId,
                    sellerId: user.id,
                    note: note.trim() || (
                        action === "packing"
                            ? "Seller started packing."
                            : "Parcel is ready for agent pickup."
                    ),
                },
            ],
        };
    });

    localStorage.setItem(ORDER_KEY, JSON.stringify(updated));
}

// ================== REPORT ORDER ISSUE ==================
export function reportSellerIssue(user, orderId, parcelId, reason) {
    const current = getSellerOrder(user, orderId, parcelId);
    const note = reason.trim();

    if (!current) {
        throw new Error("Seller order not found.");
    }

    if (note.length < 5 || note.length > 300) {
        throw new Error(
            "Enter an issue description of 5–300 characters."
        );
    }

    if (current.exception?.status === "Open") {
        throw new Error("This order already has an open exception.");
    }

    const now = new Date().toISOString();

    const updated = readOrders().map((order) => {
        if (String(order.id || order._id) !== orderId) {
            return order;
        }

        return {
            ...order,
            exception: {
                status: "Open",
                reason: note,
                openedAt: now,
            },
            activity: [
                ...(order.activity || []),
                {
                    type: "flag",
                    date: now,
                    note,
                    parcelId,
                    sellerId: user.id,
                },
            ],
        };
    });

    localStorage.setItem(ORDER_KEY, JSON.stringify(updated));
}

export async function getCustomerOrders() {
    const orders = [];

    for (let page = 1; ; page += 1) {
        const { data } = await api.get("/orders", {
            params: { page },
        });

        orders.push(...data.orders);

        if (!data.hasMore) return orders;
    }
}

export async function getCustomerOrder(id) {
    const { data } = await api.get(
        `/orders/${encodeURIComponent(id)}`
    );

    return data.order;
}