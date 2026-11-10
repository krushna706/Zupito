const mongoose = require("mongoose");

const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const SellerOrder = require("../models/SellerOrder");
const StockMovement = require("../models/StockMovement");

const ExpressError = require("../utils/ExpressError");
const { displayPricing } = require("../config/orderRules");
const SellerProfile = require("../models/SellerProfile");

// Confirmation and expiry update the same order transactionally.
exports.settleOrder = (orderId, capturedPayment = null) =>
    mongoose.connection.transaction(async (session) => {
        const order = await Order.findById(orderId).session(session);

        if (!order) {
            throw new ExpressError(404, "Order not found.");
        }

        if (order.status !== "AwaitingPayment") return order;

        if (!capturedPayment && order.expiresAt > new Date()) {
            return order;
        }

        for (const item of order.items) {
            const product = await Product.findById(
                item.productId
            ).session(session);

            const variant = product?.variants.find(
                (entry) => entry.variantId === item.variantId
            );

            if (
                !variant ||
                variant.reservedQuantity < item.quantity ||
                variant.stock < item.quantity
            ) {
                throw new ExpressError(
                    409,
                    "Inventory needs reconciliation. Payment confirmation will be retried."
                );
            }

            const changed = await Product.updateOne(
                { _id: product._id, __v: product.__v },
                {
                    $inc: {
                        "variants.$[item].reservedQuantity": -item.quantity,
                        ...(capturedPayment
                            ? { "variants.$[item].stock": -item.quantity }
                            : {}),
                        __v: 1,
                    },
                },
                {
                    session,
                    arrayFilters: [
                        { "item.variantId": item.variantId },
                    ],
                }
            );

            if (!changed.matchedCount) {
                throw new ExpressError(
                    409,
                    "Inventory changed. Confirmation will be retried."
                );
            }

            if (capturedPayment) {
                await StockMovement.create(
                    [
                        {
                            sellerProfileId: item.sellerProfileId,
                            productId: item.productId,
                            variantId: item.variantId,
                            sku: item.sku,
                            type: "Sale",
                            source: "order",
                            beforeQuantity: variant.stock,
                            quantityChange: -item.quantity,
                            afterQuantity: variant.stock - item.quantity,
                            reason: "Paid customer order",
                            reference: String(order._id),
                            operationKey:
                                `sale:${order._id}:${item.productId}:${item.variantId}`,
                            actorUserId: order.userId,
                        },
                    ],
                    { session }
                );
            }
        }

        if (capturedPayment) {
            const groups = new Map();

            order.items.forEach((item, index) => {
                const indexes = groups.get(item.sellerProfileId) || [];
                indexes.push(index);
                groups.set(item.sellerProfileId, indexes);
            });

            for (const [sellerProfileId, itemIndexes] of groups) {
                await SellerOrder.create(
                    [{ orderId, sellerProfileId, itemIndexes }],
                    { session }
                );
            }

            await Payment.updateOne(
                { orderId },
                { $set: { providerPaymentId: capturedPayment.id } },
                { session }
            );

            // Preserve a cart edited while payment was in progress.
            const cart = await Cart.updateOne(
                {
                    userId: order.userId,
                    __v: order.cartVersion,
                },
                {
                    $set: { items: [] },
                    $inc: { __v: 1 },
                },
                { session }
            );

            order.cartCleared = Boolean(cart.matchedCount);
            order.confirmedAt = new Date();
        }

        order.status = capturedPayment ? "Confirmed" : "Expired";
        order.active = false;
        order.reserved = false;

        await order.save({ session });

        return order;
    });

// Payment state stays on Order; fulfilment belongs to each seller parcel.
function fulfillmentStatus(parcels, fallback = "Confirmed") {
    const statuses = parcels.map((parcel) => parcel.status);

    if (!statuses.length) return fallback;

    return statuses.every((status) => status === statuses[0])
        ? statuses[0]
        : "in_progress";
}

exports.readOrder = async (userId, id) => {
    const order = await Order.findOne({ _id: id, userId }).lean();

    if (!order) {
        throw new ExpressError(404, "Order not found.");
    }

    const payment = await Payment.findOne({ orderId: id }).lean();
    const records = await SellerOrder.find({ orderId: id }).lean();

    const profiles = await SellerProfile.find({
        _id: { $in: records.map((parcel) => parcel.sellerProfileId) },
    })
        .select("storeName pickupAddress.pincode")
        .lean();

    const stores = new Map(
        profiles.map((profile) => [String(profile._id), profile])
    );

    const parcels = records.map((parcel) => ({
        id: String(parcel._id),
        sellerProfileId: String(parcel.sellerProfileId),
        sellerName:
            stores.get(String(parcel.sellerProfileId))?.storeName ||
            "Seller",
        pickupPincode:
            stores.get(String(parcel.sellerProfileId))
                ?.pickupAddress?.pincode || "",
        status: parcel.status,
        itemIndexes: parcel.itemIndexes,
        confirmedAt: parcel.confirmedAt,
        packingAt: parcel.packingAt,
        packedAt: parcel.readyForPickupAt,
        readyForPickupAt: parcel.readyForPickupAt,
        eventTimestamps: {
            confirmedAt: parcel.confirmedAt,
            packingAt: parcel.packingAt,
            packedAt: parcel.readyForPickupAt,
            readyForPickupAt: parcel.readyForPickupAt,
        },
    }));

    const items = order.items.map((item, index) => ({
        ...item,
        _id: `${order._id}-${index}`,
        price: item.pricePaise / 100,
        mrp: item.mrpPaise / 100,
        productSnapshot: {
            name: item.name,
            image: item.image,
            variantId: item.variantId,
            variantLabel: item.variantLabel,
        },
        product: {
            _id: item.productId,
            name: item.name,
            image: item.image,
            images: item.images,
            variantLabel: item.variantLabel,
        },
    }));

    return {
        _id: String(order._id),
        id: String(order._id),
        orderId: String(order._id),
        items,
        parcels,
        orderStatus: fulfillmentStatus(parcels, order.status),
        customerName: order.address.name,
        address: order.address,
        shippingAddress: order.address,
        pricing: {
            subtotal: order.pricing.originalPrice / 100,
            shippingFee: order.pricing.deliveryCharge / 100,
            discount: order.pricing.totalSavings / 100,
        },
        summary: displayPricing(order.pricing),
        totalAmount: order.pricing.total / 100,
        status: order.status,
        paymentStatus:
            order.status === "Confirmed" ? "Paid" : order.status,
        paymentMethod: "Razorpay",
        paymentId: payment?.providerPaymentId || "",
        createdAt: order.createdAt,
        confirmedAt: order.confirmedAt,
        expiresAt: order.expiresAt,
        cartCleared: order.cartCleared,
    };
};

exports.readManagedOrder = async (
    orderId,
    sellerProfileId = null,
    parcelId = null
) => {
    const order = await Order.findOne({
        _id: orderId,
        status: "Confirmed",
    })
        .select("userId")
        .lean();

    if (!order) {
        throw new ExpressError(404, "Order not found.");
    }

    const filter = {
        orderId,
        ...(sellerProfileId ? { sellerProfileId } : {}),
        ...(parcelId ? { _id: parcelId } : {}),
    };

    const records = await SellerOrder.find(filter).lean();

    if (sellerProfileId && !records.length) {
        throw new ExpressError(404, "Seller parcel not found.");
    }

    const full = await exports.readOrder(order.userId, orderId);

    // Admin can inspect every parcel in the customer order.
    if (!sellerProfileId) {
        full.items = full.items.map((item, index) => ({
            ...item,
            sellerName:
                full.parcels.find((parcel) =>
                    parcel.itemIndexes.includes(index)
                )?.sellerName || "Seller",
        }));

        full.activity = records.flatMap((parcel) =>
            (parcel.history || []).map((event) => ({
                type: event.status,
                date: event.date,
                note: event.note,
                parcelId: String(parcel._id),
            }))
        );

        return full;
    }

    // Sellers receive only their items and parcel information.
    return records.map((record) => {
        const parcel = full.parcels.find(
            (item) => item.id === String(record._id)
        );

        const items = record.itemIndexes
            .map((index) => full.items[index])
            .filter(Boolean);

        return {
            orderId: full.orderId,
            parcelId: parcel.id,
            parcel,
            items,
            customerName: full.customerName,
            address: full.address,
            createdAt: full.createdAt,
            status: record.status.toLowerCase().replace(/\s+/g, "_"),
            paymentStatus: "Paid",
            paymentMethod: "Razorpay",
            amount: items.reduce(
                (sum, item) => sum + item.pricePaise * item.quantity,
                0
            ) / 100,
            activity: [
                {
                    type: "confirmed",
                    date: record.confirmedAt,
                    note: "Paid order confirmed.",
                    parcelId: parcel.id,
                },
                ...(record.history || []).map((event) => ({
                    type: event.status,
                    date: event.date,
                    note: event.note,
                    parcelId: parcel.id,
                })),
            ],
        };
    });
};

exports.advanceParcel = async (
    sellerProfileId,
    actorUserId,
    orderId,
    parcelId,
    status,
    note
) => {
    const previous = {
        Packing: "Confirmed",
        "Ready for Pickup": "Packing",
    }[status];

    if (!previous) {
        throw new ExpressError(400, "Invalid fulfilment status.");
    }

    await mongoose.connection.transaction(async (session) => {
        const order = await Order.findOne({
            _id: orderId,
            status: "Confirmed",
        })
            .session(session)
            .lean();

        if (!order) {
            throw new ExpressError(404, "Paid order not found.");
        }

        const filter = {
            _id: parcelId,
            orderId,
            sellerProfileId,
        };

        const parcel = await SellerOrder.findOne(filter)
            .session(session)
            .lean();

        if (!parcel) {
            throw new ExpressError(404, "Seller parcel not found.");
        }

        // Repeated requests do not append duplicate history.
        if (parcel.status === status) return;

        if (parcel.status !== previous) {
            throw new ExpressError(
                409,
                "Parcel status changed. Refresh and try again."
            );
        }

        const now = new Date();

        const result = await SellerOrder.updateOne(
            { ...filter, status: previous },
            {
                $set: {
                    status,
                    [status === "Packing"
                        ? "packingAt"
                        : "readyForPickupAt"]: now,
                },
                $push: {
                    history: {
                        status,
                        note,
                        actorUserId,
                        date: now,
                    },
                },
            },
            { session, runValidators: true }
        );

        if (!result.matchedCount) {
            throw new ExpressError(
                409,
                "Parcel status changed. Refresh and try again."
            );
        }
    });

    return (
        await exports.readManagedOrder(
            orderId,
            sellerProfileId,
            parcelId
        )
    )[0];
};