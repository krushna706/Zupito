const Joi = require("joi");

const Order = require("../models/Order");
const Payment = require("../models/Payment");

const payment = require("../services/payment/paymentService");
const provider = require("../services/payment/razorpayProvider");

const { getPaymentConfig } = require("../config/payment");
const ExpressError = require("../utils/ExpressError");

exports.status = async (req, res, next) => {
    try {
        if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
            throw new ExpressError(404, "Order not found.");
        }

        // Check ownership before contacting the provider.
        if (
            !(await Order.exists({
                _id: req.params.id,
                userId: req.user._id,
            }))
        ) {
            throw new ExpressError(404, "Order not found.");
        }

        try {
            await payment.synchronizePayment(req.params.id);
        } catch {
            // Return saved status while reconciliation retries.
        }

        res.json(await payment.checkoutStatus(req.user._id, req.params.id));
    } catch (error) {
        next(error);
    }
};

exports.verify = async (req, res, next) => {
    try {
        if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
            throw new ExpressError(404, "Order not found.");
        }

        const { value, error } = Joi.object({
            razorpay_order_id: Joi.string()
                .pattern(/^order_[a-zA-Z0-9]+$/)
                .required(),
            razorpay_payment_id: Joi.string()
                .pattern(/^pay_[a-zA-Z0-9]+$/)
                .required(),
            razorpay_signature: Joi.string().hex().length(64).required(),
        }).validate(req.body);

        if (error) {
            throw new ExpressError(400, "Invalid payment verification details.");
        }

        res.json(await payment.verifyPayment(req.user._id, req.params.id, value));
    } catch (error) {
        next(error);
    }
};

exports.webhook = async (req, res, next) => {
    try {
        if (
            !Buffer.isBuffer(req.body) ||
            !provider.validSignature(
                req.body,
                req.get("X-Razorpay-Signature"),
                getPaymentConfig().webhookSecret
            )
        ) {
            throw new ExpressError(400, "Invalid webhook signature.");
        }

        let event;

        try {
            event = JSON.parse(req.body.toString("utf8"));
        } catch {
            throw new ExpressError(400, "Invalid webhook body.");
        }

        const providerOrderId =
            event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id;

        const refundPaymentId = event.payload?.refund?.entity?.payment_id;

        if (typeof providerOrderId === "string" || typeof refundPaymentId === "string") {
            const filter =
                typeof providerOrderId === "string"
                    ? { providerOrderId }
                    : { providerPaymentId: refundPaymentId };

            const saved = await Payment.findOne(filter).select("orderId");

            if (saved) {
                // Persist work before processing the event.
                await Payment.updateOne(
                    { _id: saved._id },
                    {
                        $set: {
                            nextCheckAt: new Date(),
                        },
                    }
                );

                if (refundPaymentId) {
                    await require("../models/Refund").updateMany(
                        { paymentId: refundPaymentId, status: { $in: ["Queued", "Pending"] } },
                        { $set: { nextCheckAt: new Date() } }
                    );
                }
            }
        }

        res.json({ received: true });
    } catch (error) {
        next(error);
    }
};
// Admin payment reporting uses saved gateway references, never credentials.
exports.list = async (req, res, next) => {
    try {
        const rows = await Payment.find().sort({ createdAt: -1 }).limit(1000).lean();
        const orders = await Order.find({ _id: { $in: rows.map((row) => row.orderId) } })
            .select("address.name pricing.total status createdAt")
            .lean();
        const map = new Map(orders.map((order) => [String(order._id), order]));
        res.json({
            payments: rows.map((row) => {
                const order = map.get(String(row.orderId));
                return {
                    id: String(row._id),
                    orderId: String(row.orderId),
                    customerName: order?.address.name || "Customer",
                    amount: (order?.pricing.total || 0) / 100,
                    status:
                        order?.status === "Confirmed"
                            ? "Successful"
                            : ["Expired", "Refunded"].includes(order?.status)
                              ? "Cancelled"
                              : "Pending",
                    method: "Razorpay",
                    gatewayOrderId: row.providerOrderId,
                    gatewayPaymentId: row.providerPaymentId,
                    createdAt: row.createdAt,
                    reviewStatus: row.reviewStatus || "Clear",
                    reviewReason: row.reviewReason || "",
                    reviewHistory: row.reviewHistory || [],
                };
            }),
            orders: orders.map((order) => ({ _id: String(order._id), orderStatus: order.status })),
        });
    } catch (error) {
        next(error);
    }
};
exports.review = async (req, res, next) => {
    try {
        const { value, error } = Joi.object({
            status: Joi.string().valid("Flagged", "Closed").required(),
            note: Joi.string().trim().min(5).max(300).required(),
        }).validate(req.body);
        if (error || !/^[a-f0-9]{24}$/i.test(req.params.id))
            throw new ExpressError(400, "Invalid payment review.");
        const row = await Payment.findByIdAndUpdate(
            req.params.id,
            {
                $set: { reviewStatus: value.status, reviewReason: value.note },
                $push: {
                    reviewHistory: {
                        status: value.status,
                        note: value.note,
                        date: new Date(),
                        actorUserId: req.user._id,
                    },
                },
            },
            { returnDocument: "after", runValidators: true }
        );
        if (!row) throw new ExpressError(404, "Payment not found.");
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
