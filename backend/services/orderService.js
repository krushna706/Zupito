const mongoose = require("mongoose");

const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const SellerOrder = require("../models/SellerOrder");
const StockMovement = require("../models/StockMovement");

const ExpressError = require("../utils/ExpressError");
const { displayPricing } = require("../config/orderRules");

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

exports.readOrder = async (userId, id) => {
    const order = await Order.findOne({
        _id: id,
        userId,
    }).lean();

    if (!order) {
        throw new ExpressError(404, "Order not found.");
    }

    const payment = await Payment.findOne({ orderId: id }).lean();

    const parcels = await SellerOrder.find({ orderId: id })
        .select("status itemIndexes confirmedAt createdAt")
        .lean();

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
        orderId: String(order._id),
        items,
        parcels,
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