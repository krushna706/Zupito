const { randomUUID } = require("node:crypto");

const Order = require("../../models/Order");
const Payment = require("../../models/Payment");
const provider = require("./razorpayProvider");

const { getPaymentConfig } = require("../../config/payment");
const { settleOrder, readOrder } = require("../orderService");
const ExpressError = require("../../utils/ExpressError");

async function ensureProviderOrder(order, payment) {
    if (payment.providerOrderId) {
        return payment.providerOrderId;
    }

    const claimed = await Payment.findOneAndUpdate(
        {
            _id: payment._id,
            creationStarted: false,
        },
        {
            $set: { creationStarted: true },
        }
    );

    let remote;

    if (claimed && order.status === "AwaitingPayment" && order.expiresAt > new Date()) {
        remote = await provider.createOrder(order);
    } else {
        const found = await provider.findOrders(String(order._id));

        remote = found.items.find((item) => item.receipt === String(order._id));
    }

    if (!remote) return null;

    if (
        remote.amount !== order.pricing.total ||
        remote.currency !== "INR" ||
        remote.receipt !== String(order._id)
    ) {
        throw new ExpressError(409, "Payment order details do not match checkout.");
    }

    await Payment.updateOne({ _id: payment._id }, { $set: { providerOrderId: remote.id } });

    return remote.id;
}

exports.synchronizePayment = async (orderId) => {
    const payment = await Payment.findOneAndUpdate(
        {
            orderId,
            lockUntil: { $lte: new Date() },
        },
        {
            $set: {
                lockUntil: new Date(Date.now() + 90000),
                lockToken: randomUUID(),
            },
        },
        { returnDocument: "after" }
    );

    if (!payment) return;

    let nextCheckAt = new Date(Date.now() + 60000);

    try {
        let order = await Order.findById(orderId);

        if (!order) return;

        if (order.status === "Confirmed" || order.status === "Refunded") {
            nextCheckAt = null;
            return;
        }

        const providerOrderId = await ensureProviderOrder(order, payment);

        if (providerOrderId) {
            const collection = await provider.fetchPayments(providerOrderId);

            let captured = collection.items.find(
                (item) => item.status === "captured" || item.status === "refunded"
            );

            const authorized = collection.items.find((item) => item.status === "authorized");

            const candidate = captured || authorized;

            if (
                candidate &&
                (candidate.order_id !== providerOrderId ||
                    candidate.currency !== "INR" ||
                    candidate.amount !== order.pricing.total)
            ) {
                throw new ExpressError(409, "Payment amount does not match checkout.");
            }

            if (
                !captured &&
                authorized &&
                order.status === "AwaitingPayment" &&
                order.expiresAt > new Date()
            ) {
                captured = await provider.capture(authorized.id, order.pricing.total);
            }

            if (captured && captured.status === "captured") {
                order = await settleOrder(orderId, captured);

                if (order.status === "Confirmed") {
                    nextCheckAt = null;
                    return;
                }

                // Never fulfil an order after its stock reservation expired.
                await Order.updateOne(
                    {
                        _id: orderId,
                        status: "Expired",
                    },
                    {
                        $set: { status: "Refunding" },
                    }
                );

                await Payment.updateOne(
                    { orderId },
                    {
                        $set: {
                            providerPaymentId: captured.id,
                        },
                    }
                );

                const refund = payment.refundId
                    ? await provider.fetchRefund(payment.refundId)
                    : await provider.refund(captured.id, order.pricing.total, String(orderId));

                await Payment.updateOne(
                    { orderId },
                    {
                        $set: {
                            refundId: refund.id,
                            refundStatus: refund.status,
                        },
                    }
                );

                if (refund.status === "processed") {
                    await Order.updateOne(
                        {
                            _id: orderId,
                            status: {
                                $in: ["Refunding", "PaymentReview"],
                            },
                        },
                        {
                            $set: { status: "Refunded" },
                        }
                    );

                    nextCheckAt = null;
                } else if (refund.status === "failed") {
                    await Order.updateOne(
                        { _id: orderId },
                        {
                            $set: { status: "PaymentReview" },
                        }
                    );

                    nextCheckAt = new Date(Date.now() + 60 * 60 * 1000);
                }

                return;
            }

            if (captured?.status === "refunded") {
                await Order.updateOne(
                    {
                        _id: orderId,
                        status: "AwaitingPayment",
                    },
                    {
                        $set: { expiresAt: new Date(0) },
                    }
                );

                await settleOrder(orderId);

                await Order.updateOne(
                    {
                        _id: orderId,
                        status: {
                            $in: ["Expired", "Refunding", "PaymentReview"],
                        },
                    },
                    {
                        $set: { status: "Refunded" },
                    }
                );

                nextCheckAt = null;
                return;
            }
        }

        order = await settleOrder(orderId);

        if (order.status === "Expired") {
            // Keep records available for delayed payment recovery.
            nextCheckAt = new Date(Date.now() + 60 * 60 * 1000);
        }
    } catch (error) {
        await Payment.updateOne(
            { orderId },
            {
                $set: {
                    lastFailure: "Reconciliation pending",
                },
            }
        );

        throw error;
    } finally {
        await Payment.updateOne(
            {
                _id: payment._id,
                lockToken: payment.lockToken,
            },
            {
                $set: {
                    lockUntil: new Date(0),
                    nextCheckAt,
                },
                $unset: {
                    lockToken: 1,
                },
            }
        );
    }
};

exports.checkoutStatus = async (userId, id) => {
    const order = await readOrder(userId, id);
    const payment = await Payment.findOne({ orderId: id }).lean();

    const canPay =
        order.status === "AwaitingPayment" &&
        new Date(order.expiresAt) > new Date() &&
        Boolean(payment.providerOrderId);

    return {
        order,
        checkout: canPay
            ? {
                  key: getPaymentConfig().keyId,
                  order_id: payment.providerOrderId,
                  amount: Math.round(order.totalAmount * 100),
                  currency: "INR",
                  name: "Zupito",
                  description: "Order payment",
                  prefill: {
                      name: order.address.name,
                      contact: order.address.phone,
                  },
                  timeout: Math.max(1, Math.floor((new Date(order.expiresAt) - Date.now()) / 1000)),
              }
            : null,
    };
};

exports.verifyPayment = async (userId, id, values) => {
    await readOrder(userId, id);

    const payment = await Payment.findOne({ orderId: id }).lean();

    if (
        !payment?.providerOrderId ||
        payment.providerOrderId !== values.razorpay_order_id ||
        !provider.validSignature(
            `${payment.providerOrderId}|${values.razorpay_payment_id}`,
            values.razorpay_signature,
            getPaymentConfig().keySecret
        )
    ) {
        throw new ExpressError(400, "Invalid payment verification.");
    }

    const remote = await provider.fetchPayment(values.razorpay_payment_id);

    if (remote.order_id !== payment.providerOrderId) {
        throw new ExpressError(400, "Payment order mismatch.");
    }

    await exports.synchronizePayment(id);

    return exports.checkoutStatus(userId, id);
};
