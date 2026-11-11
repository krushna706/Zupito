const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");

const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Refund = require("../models/Refund");
const SellerOrder = require("../models/SellerOrder");
const DeliveryTask = require("../models/DeliveryTask");
const DeliveryAgentProfile = require("../models/DeliveryAgentProfile");
const Product = require("../models/Product");
const StockMovement = require("../models/StockMovement");
const ExpressError = require("../utils/ExpressError");
const otp = require("./deliveryOtpService");
const provider = require("./payment/razorpayProvider");

const ALLOWED = ["Confirmed", "Packing", "Ready for Pickup"];

const RETRY_LIMIT = 5;

// ================== REFUND ALLOCATION ==================
// Allocate coupon and shipping across the original parcels.
function allocation(order, parcels) {
    const subtotal = order.pricing.subtotal;
    const coupon = order.pricing.couponDiscount || 0;
    const shipping = order.pricing.deliveryCharge || 0;

    if (!Number.isSafeInteger(subtotal) || subtotal <= 0) {
        throw new ExpressError(409, "Order pricing needs reconciliation.");
    }

    const result = new Map();

    let cumulative = 0;
    let givenCoupon = 0;
    let givenShipping = 0;

    const sorted = [...parcels].sort((a, b) => String(a._id).localeCompare(String(b._id)));

    for (const parcel of sorted) {
        const gross = parcel.itemIndexes.reduce((sum, index) => {
            const item = order.items[index];

            if (!item) {
                throw new ExpressError(409, "Invalid parcel item allocation.");
            }

            return sum + item.pricePaise * item.quantity;
        }, 0);

        cumulative += gross;

        const newCoupon = Math.floor((coupon * cumulative) / subtotal);

        const newShipping = Math.floor((shipping * cumulative) / subtotal);

        const couponShare = newCoupon - givenCoupon;
        const shippingShare = newShipping - givenShipping;

        result.set(String(parcel._id), {
            gross,
            couponShare,
            shippingShare,
            amount: gross - couponShare + shippingShare,
        });

        givenCoupon = newCoupon;
        givenShipping = newShipping;
    }

    const allocatedTotal = [...result.values()].reduce((sum, row) => sum + row.amount, 0);

    if (cumulative !== subtotal || allocatedTotal !== order.pricing.total) {
        throw new ExpressError(409, "Order pricing needs reconciliation before cancellation.");
    }

    return result;
}

// ================== CANCEL PAID PARCELS ==================
// All database changes must succeed together.
exports.cancel = async (userId, orderId, requestedIds, reason, details = "") => {
    const ids = [...new Set(requestedIds.map(String))];

    const created = await mongoose.connection.transaction(async (session) => {
        const order = await Order.findOne({
            _id: orderId,
            userId,
            status: "Confirmed",
        }).session(session);

        if (!order) {
            throw new ExpressError(404, "Confirmed order not found.");
        }

        const payment = await Payment.findOne({
            orderId,
        }).session(session);

        const parcels = await SellerOrder.find({
            orderId,
        }).session(session);

        if (!payment?.providerPaymentId || !parcels.length) {
            throw new ExpressError(409, "Payment is not ready for cancellation.");
        }

        const target = parcels.filter((parcel) => ids.includes(String(parcel._id)));

        if (!target.length || target.length !== ids.length) {
            throw new ExpressError(400, "Select valid parcels belonging to this order.");
        }

        const amounts = allocation(order, parcels);
        const refunds = [];
        const now = new Date();

        for (const parcel of target) {
            if (!ALLOWED.includes(parcel.status)) {
                throw new ExpressError(409, "Parcel has already been picked up or cancelled.");
            }

            // ================== DELIVERY CUSTODY ==================
            const task = await DeliveryTask.findOne({
                sellerOrderId: parcel._id,
                kind: "original",
            })
                .select("+otpHash +otpCiphertext")
                .session(session);

            if (task) {
                if (
                    task.custody !== "Seller" ||
                    !["ready_for_pickup", "assigned", "failed"].includes(task.stage)
                ) {
                    throw new ExpressError(409, "Parcel is already in delivery custody.");
                }

                if (task.agentProfileId) {
                    const released = await DeliveryAgentProfile.updateOne(
                        {
                            _id: task.agentProfileId,
                            activeTasks: { $gt: 0 },
                        },
                        {
                            $inc: {
                                activeTasks: -1,
                            },
                        },
                        { session }
                    );

                    if (!released.modifiedCount) {
                        throw new ExpressError(409, "Delivery workload needs reconciliation.");
                    }
                }

                task.stage = "cancelled";
                task.retryAt = undefined;

                task.events.push({
                    date: now,
                    actorUserId: userId,
                    note: "Customer cancelled before pickup.",
                });

                otp.clear(task);

                await task.save({ session });
            }

            // ================== RESTORE INVENTORY ==================
            for (const index of parcel.itemIndexes) {
                const item = order.items[index];

                const product = await Product.findById(item.productId).session(session);

                const variant = product?.variants.find((row) => row.variantId === item.variantId);

                if (!variant) {
                    throw new ExpressError(409, "Product stock needs reconciliation.");
                }

                const updated = await Product.updateOne(
                    {
                        _id: product._id,
                        __v: product.__v,
                    },
                    {
                        $inc: {
                            "variants.$[v].stock": item.quantity,
                            __v: 1,
                        },
                    },
                    {
                        session,
                        arrayFilters: [
                            {
                                "v.variantId": item.variantId,
                            },
                        ],
                    }
                );

                if (!updated.modifiedCount) {
                    throw new ExpressError(409, "Stock changed. Retry cancellation.");
                }

                await StockMovement.create(
                    [
                        {
                            sellerProfileId: item.sellerProfileId,
                            productId: item.productId,
                            variantId: item.variantId,
                            sku: item.sku,
                            type: "Adjustment",
                            source: "order",
                            beforeQuantity: variant.stock,
                            quantityChange: item.quantity,
                            afterQuantity: variant.stock + item.quantity,
                            reason: "Cancelled paid order - stock restored",
                            reference: String(orderId),
                            operationKey: `cancel:${parcel._id}:${index}`,
                            actorUserId: userId,
                        },
                    ],
                    { session }
                );
            }

            // ================== CANCEL SELLER PARCEL ==================
            const changed = await SellerOrder.updateOne(
                {
                    _id: parcel._id,
                    status: parcel.status,
                },
                {
                    $set: {
                        status: "Cancelled",
                        cancelledAt: now,
                        cancellationReason: reason,
                    },
                    $push: {
                        history: {
                            status: "Cancelled",
                            note: reason,
                            actorUserId: userId,
                            date: now,
                        },
                    },
                },
                { session }
            );

            if (!changed.modifiedCount) {
                throw new ExpressError(409, "Parcel status changed. Retry cancellation.");
            }

            // ================== CREATE REFUND ==================
            const share = amounts.get(String(parcel._id));

            if (share.amount < 100) {
                throw new ExpressError(
                    409,
                    "Refund allocation below provider minimum. Contact support."
                );
            }

            const [record] = await Refund.create(
                [
                    {
                        orderId,
                        sellerOrderId: parcel._id,
                        sellerProfileId: parcel.sellerProfileId,
                        userId,
                        paymentId: payment.providerPaymentId,
                        amountPaise: share.amount,
                        productAmountPaise: share.gross,
                        couponSharePaise: share.couponShare,
                        deliverySharePaise: share.shippingShare,
                        reason,
                        details,
                        cancelledAt: now,
                        idempotencyKey: `cancel_${parcel._id}`,
                    },
                ],
                { session }
            );

            refunds.push(record);
        }

        // Serialize competing cancellations for this order.
        const updatedOrder = await Order.updateOne(
            {
                _id: order._id,
                __v: order.__v,
            },
            {
                $inc: {
                    __v: 1,
                },
            },
            { session }
        );

        if (!updatedOrder.modifiedCount) {
            throw new ExpressError(409, "Order changed. Refresh and retry cancellation.");
        }

        return refunds;
    });

    return created.map(exports.publicRefund);
};

// ================== PUBLIC REFUND RESPONSE ==================
exports.publicRefund = (refund) => ({
    id: String(refund._id),
    orderId: String(refund.orderId),
    parcelId: String(refund.sellerOrderId),
    customerId: String(refund.userId),
    amount: refund.amountPaise / 100,
    status: refund.status,
    reference: refund.providerRefundId || "",
    reason: refund.reason,
    details: refund.details,
    attempts: refund.attempts,
    failureReason: refund.lastFailure,
    reviewStatus: refund.reviewStatus,
    reviewReason: refund.reviewReason,
    reviewHistory: refund.reviewHistory,
    cancelledAt: refund.cancelledAt,
    completedAt: refund.processedAt,
    createdAt: refund.createdAt,
    breakdown: {
        products: refund.productAmountPaise / 100,
        coupon: refund.couponSharePaise / 100,
        shipping: refund.deliverySharePaise / 100,
    },
});

// ================== PROVIDER SYNCHRONIZATION ==================
exports.processOne = async (refundId) => {
    const token = randomUUID();
    const now = new Date();

    const record = await Refund.findOneAndUpdate(
        {
            _id: refundId,
            status: { $in: ["Queued", "Pending"] },
            nextCheckAt: { $lte: now },
            lockUntil: { $lte: now },
        },
        {
            $set: {
                lockUntil: new Date(Date.now() + 90000),
                lockToken: token,
            },
        },
        { returnDocument: "after" }
    );

    if (!record) return;

    try {
        const remote = record.providerRefundId
            ? await provider.fetchRefund(record.providerRefundId)
            : await provider.refundCancellation(
                  record.paymentId,
                  record.amountPaise,
                  record.idempotencyKey
              );

        if (
            remote.payment_id !== record.paymentId ||
            remote.amount !== record.amountPaise ||
            remote.currency !== "INR"
        ) {
            throw new ExpressError(409, "Refund provider returned an unexpected transaction.");
        }

        const status =
            remote.status === "processed"
                ? "Completed"
                : remote.status === "failed"
                  ? "Review"
                  : "Pending";

        const failed = remote.status === "failed";

        await Refund.updateOne(
            {
                _id: record._id,
                lockToken: token,
            },
            {
                $set: {
                    providerRefundId: remote.id,
                    status,
                    processedAt: status === "Completed" ? new Date() : undefined,
                    nextCheckAt: status === "Pending" ? new Date(Date.now() + 60000) : null,
                    lastFailure: failed ? "Provider reported refund failure." : "",
                    ...(failed
                        ? {
                              reviewStatus: "Open",
                              reviewReason: "Provider reported refund failure.",
                          }
                        : {}),
                },
            }
        );
    } catch (error) {
        const attempts = record.attempts + 1;
        const exhausted = attempts >= RETRY_LIMIT;

        await Refund.updateOne(
            {
                _id: record._id,
                lockToken: token,
            },
            {
                $set: {
                    attempts,
                    status: exhausted ? "Review" : record.status,
                    nextCheckAt: exhausted
                        ? null
                        : new Date(Date.now() + Math.min(3600000, 60000 * 2 ** attempts)),
                    lastFailure: "Gateway confirmation pending; retry scheduled.",
                    ...(exhausted
                        ? {
                              reviewStatus: "Open",
                              reviewReason: "Automatic refund retries exhausted.",
                          }
                        : {}),
                },
            }
        );
    } finally {
        await Refund.updateOne(
            {
                _id: record._id,
                lockToken: token,
            },
            {
                $set: {
                    lockUntil: new Date(0),
                },
                $unset: {
                    lockToken: "",
                },
            }
        );
    }
};

// Settlement and refunds share the exact same allocation/rounding rules.
exports.allocation = allocation;
