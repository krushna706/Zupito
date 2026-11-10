
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const SellerOrder = require("../models/SellerOrder");
const StockMovement = require("../models/StockMovement");
const SellerProfile = require("../models/SellerProfile");
const DeliveryTask = require("../models/DeliveryTask");
const DeliveryAgentProfile = require("../models/DeliveryAgentProfile");

const ExpressError = require("../utils/ExpressError");
const { displayPricing } = require("../config/orderRules");

const deliveryService = require("./deliveryService");
const otpService = require("./deliveryOtpService");

// ================== PAYMENT SETTLEMENT ==================
// Payment confirmation and inventory share one transaction.
exports.settleOrder = (orderId, capturedPayment = null) =>
    mongoose.connection.transaction(async (session) => {
        const order = await Order.findById(orderId)
            .session(session);

        if (!order) {
            throw new ExpressError(404, "Order not found.");
        }

        if (order.status !== "AwaitingPayment") {
            return order;
        }

        if (
            !capturedPayment &&
            order.expiresAt > new Date()
        ) {
            return order;
        }

        for (const item of order.items) {
            const product = await Product.findById(
                item.productId
            ).session(session);

            const variant = product?.variants.find(
                (entry) =>
                    entry.variantId === item.variantId
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
                {
                    _id: product._id,
                    __v: product.__v,
                },
                {
                    $inc: {
                        "variants.$[item].reservedQuantity":
                            -item.quantity,

                        ...(capturedPayment
                            ? {
                                "variants.$[item].stock":
                                    -item.quantity,
                            }
                            : {}),

                        __v: 1,
                    },
                },
                {
                    session,
                    arrayFilters: [{
                        "item.variantId": item.variantId,
                    }],
                }
            );

            if (!changed.matchedCount) {
                throw new ExpressError(
                    409,
                    "Inventory changed. Confirmation will be retried."
                );
            }

            if (capturedPayment) {
                await StockMovement.create([{
                    sellerProfileId: item.sellerProfileId,
                    productId: item.productId,
                    variantId: item.variantId,
                    sku: item.sku,
                    type: "Sale",
                    source: "order",
                    beforeQuantity: variant.stock,
                    quantityChange: -item.quantity,
                    afterQuantity:
                        variant.stock - item.quantity,
                    reason: "Paid customer order",
                    reference: String(order._id),
                    operationKey:
                        `sale:${order._id}:${item.productId}:${item.variantId}`,
                    actorUserId: order.userId,
                }], { session });
            }
        }

        if (capturedPayment) {
            const groups = new Map();

            order.items.forEach((item, index) => {
                const indexes = groups.get(
                    item.sellerProfileId
                ) || [];

                indexes.push(index);

                groups.set(
                    item.sellerProfileId,
                    indexes
                );
            });

            for (const [sellerProfileId, itemIndexes] of groups) {
                await SellerOrder.create([{
                    orderId,
                    sellerProfileId,
                    itemIndexes,
                }], { session });
            }

            await Payment.updateOne(
                { orderId },
                {
                    $set: {
                        providerPaymentId: capturedPayment.id,
                    },
                },
                { session }
            );

            // Preserve a cart edited while payment was processing.
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

            order.cartCleared = Boolean(
                cart.matchedCount
            );

            order.confirmedAt = new Date();
        }

        order.status = capturedPayment
            ? "Confirmed"
            : "Expired";

        order.active = false;
        order.reserved = false;

        await order.save({ session });

        return order;
    });

// ================== ORDER STATUS ==================
function fulfillmentStatus(
    parcels,
    fallback = "Confirmed"
) {
    const statuses = parcels.map(
        (parcel) => parcel.status
    );

    if (!statuses.length) {
        return fallback;
    }

    return statuses.every(
        (status) => status === statuses[0]
    )
        ? statuses[0]
        : "in_progress";
}

// ================== CUSTOMER ORDER ==================
exports.readOrder = async (userId, id) => {
    const order = await Order.findOne({
        _id: id,
        userId,
    }).lean();

    if (!order) {
        throw new ExpressError(404, "Order not found.");
    }

    const [payment, records, deliveryTasks] =
        await Promise.all([
            Payment.findOne({
                orderId: id,
            }).lean(),

            SellerOrder.find({
                orderId: id,
            }).lean(),

            DeliveryTask.find({
                orderId: id,
                kind: "original",
            })
                .select("+otpCiphertext")
                .lean(),
        ]);

    const profiles = await SellerProfile.find({
        _id: {
            $in: records.map(
                (parcel) => parcel.sellerProfileId
            ),
        },
    })
        .select("storeName pickupAddress.pincode")
        .lean();

    const stores = new Map(
        profiles.map((profile) => [
            String(profile._id),
            profile,
        ])
    );

    const taskByParcel = new Map(
        deliveryTasks.map((task) => [
            String(task.sellerOrderId),
            task,
        ])
    );

    const agentProfiles = await DeliveryAgentProfile.find({
        _id: {
            $in: deliveryTasks
                .map((task) => task.agentProfileId)
                .filter(Boolean),
        },
    })
        .populate("userId", "name phone")
        .lean();

    const agentByProfile = new Map(
        agentProfiles.map((profile) => [
            String(profile._id),
            {
                id: String(profile._id),
                name:
                    profile.userId?.name ||
                    "Assigned Agent",
                phone: profile.userId?.phone || "",
            },
        ])
    );

    const parcels = records.map((parcel) => {
        const task = taskByParcel.get(
            String(parcel._id)
        );

        const store = stores.get(
            String(parcel.sellerProfileId)
        );

        return {
            id: String(parcel._id),
            sellerProfileId:
                String(parcel.sellerProfileId),

            sellerName:
                store?.storeName || "Seller",

            pickupPincode:
                store?.pickupAddress?.pincode || "",

            status: task?.stage === "out_for_delivery"
                ? "Out for Delivery"
                : task?.stage === "failed"
                    ? "Delivery Failed"
                    : parcel.status,

            deliveryOtp: otpService.customerCode(task),

            agent: agentByProfile.get(
                String(task?.agentProfileId)
            ) || null,

            task: task
                ? {
                    stage: task.stage,
                    custody: task.custody,
                    assignedAt: task.assignedAt,
                    pickedUpAt: task.pickedUpAt,
                    outForDeliveryAt: task.outForDeliveryAt,
                    deliveredAt: task.deliveredAt,
                }
                : null,

            deliveredAt: task?.deliveredAt,

            otpVerified:
                task?.stage === "delivered",

            delivery: {
                assignedAt: task?.assignedAt,
                pickedUpAt: task?.pickedUpAt,
                outForDeliveryAt: task?.outForDeliveryAt,
                deliveredAt: task?.deliveredAt,
            },

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
                pickedUpAt: task?.pickedUpAt,
                shippedAt: task?.pickedUpAt,
                outForDeliveryAt: task?.outForDeliveryAt,
                deliveredAt: task?.deliveredAt,
            },
        };
    });

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

        orderStatus: fulfillmentStatus(
            parcels,
            order.status
        ),

        customerName: order.address.name,
        address: order.address,
        shippingAddress: order.address,

        pricing: {
            subtotal:
                order.pricing.originalPrice / 100,

            shippingFee:
                order.pricing.deliveryCharge / 100,

            discount:
                order.pricing.totalSavings / 100,
        },

        summary: displayPricing(order.pricing),
        totalAmount: order.pricing.total / 100,
        status: order.status,

        paymentStatus:
            order.status === "Confirmed"
                ? "Paid"
                : order.status,

        paymentMethod: "Razorpay",
        paymentId: payment?.providerPaymentId || "",
        createdAt: order.createdAt,
        confirmedAt: order.confirmedAt,
        expiresAt: order.expiresAt,
        cartCleared: order.cartCleared,
    };
};

// ================== STAFF ORDER DETAILS ==================
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
        throw new ExpressError(
            404, "Order not found."
        );
    }

    const filter = {
        orderId,
        ...(sellerProfileId
            ? { sellerProfileId }
            : {}),
        ...(parcelId
            ? { _id: parcelId }
            : {}),
    };

    const records = await SellerOrder.find(
        filter
    ).lean();

    if (sellerProfileId && !records.length) {
        throw new ExpressError(
            404, "Seller parcel not found."
        );
    }

    const full = await exports.readOrder(
        order.userId,
        orderId
    );

    // Staff never receive the customer's delivery OTP.
    full.parcels.forEach((parcel) => {
        delete parcel.deliveryOtp;
    });

    // ================== ADMIN ORDER ==================
    if (!sellerProfileId) {
        full.items = full.items.map(
            (item, index) => ({
                ...item,

                sellerName:
                    full.parcels.find(
                        (parcel) =>
                            parcel.itemIndexes.includes(index)
                    )?.sellerName || "Seller",
            })
        );

        full.activity = records.flatMap(
            (parcel) =>
                (parcel.history || []).map(
                    (event) => ({
                        type: event.status,
                        date: event.date,
                        note: event.note,
                        parcelId: String(parcel._id),
                    })
                )
        );

        return full;
    }

    // ================== SELLER ORDER ==================
    return records.map((record) => {
        const parcel = full.parcels.find(
            (item) =>
                item.id === String(record._id)
        );

        const items = record.itemIndexes
            .map((index) => full.items[index])
            .filter(Boolean);

        return {
            orderId: full.orderId,
            parcelId: parcel.id,
            parcel,
            items,
            agent: parcel.agent,
            task: parcel.task,
            customerName: full.customerName,
            address: full.address,
            createdAt: full.createdAt,

            status: parcel.status
                .toLowerCase()
                .replace(/\s+/g, "_"),

            paymentStatus: "Paid",
            paymentMethod: "Razorpay",

            amount: items.reduce(
                (sum, item) =>
                    sum +
                    item.pricePaise * item.quantity,
                0
            ) / 100,

            activity: [
                {
                    type: "confirmed",
                    date: record.confirmedAt,
                    note: "Paid order confirmed.",
                    parcelId: parcel.id,
                },

                ...(record.history || []).map(
                    (event) => ({
                        type: event.status,
                        date: event.date,
                        note: event.note,
                        parcelId: parcel.id,
                    })
                ),
            ],
        };
    });
};

// ================== SELLER FULFILMENT ==================
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
        throw new ExpressError(
            400, "Invalid fulfilment status."
        );
    }

    await mongoose.connection.transaction(
        async (session) => {
            const order = await Order.findOne({
                _id: orderId,
                status: "Confirmed",
            })
                .session(session)
                .lean();

            if (!order) {
                throw new ExpressError(
                    404, "Paid order not found."
                );
            }

            const filter = {
                _id: parcelId,
                orderId,
                sellerProfileId,
            };

            const parcel = await SellerOrder.findOne(
                filter
            )
                .session(session)
                .lean();

            if (!parcel) {
                throw new ExpressError(
                    404, "Seller parcel not found."
                );
            }

            // Ignore repeated status changes.
            if (parcel.status === status) {
                return;
            }

            if (parcel.status !== previous) {
                throw new ExpressError(
                    409,
                    "Parcel status changed. Refresh and try again."
                );
            }

            const now = new Date();

            const result = await SellerOrder.updateOne(
                {
                    ...filter,
                    status: previous,
                },
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
                {
                    session,
                    runValidators: true,
                }
            );

            if (!result.matchedCount) {
                throw new ExpressError(
                    409,
                    "Parcel status changed. Refresh and try again."
                );
            }

            // Create one delivery task when seller is ready.
            if (status === "Ready for Pickup") {
                await deliveryService.queueSellerParcel(
                    order,
                    parcel,
                    session
                );
            }
        }
    );

    return (
        await exports.readManagedOrder(
            orderId,
            sellerProfileId,
            parcelId
        )
    )[0];
};
