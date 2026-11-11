const { createHmac, timingSafeEqual } = require("node:crypto");

const { getPaymentConfig } = require("../../config/payment");
const ExpressError = require("../../utils/ExpressError");

// ================== RAZORPAY REQUEST ==================
// Never expose provider credentials or raw errors.
async function request(path, method = "GET", body, headers = {}) {
    const { keyId, keySecret } = getPaymentConfig();

    try {
        const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
            method,
            headers: {
                Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
                "Content-Type": "application/json",
                ...headers,
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            throw new Error("Provider request failed");
        }

        return await response.json();
    } catch {
        throw new ExpressError(
            503,
            "Payment confirmation is temporarily unavailable. Check the payment status before retrying."
        );
    }
}

// ================== SIGNATURE ==================
exports.validSignature = (body, signature, secret) => {
    if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature)) {
        return false;
    }

    const expected = createHmac("sha256", secret).update(body).digest();

    return timingSafeEqual(expected, Buffer.from(signature, "hex"));
};

// ================== ORDERS ==================
exports.createOrder = (order) =>
    request("orders", "POST", {
        amount: order.pricing.total,
        currency: "INR",
        receipt: String(order._id),
        partial_payment: false,
        notes: {
            zupitoOrderId: String(order._id),
        },
    });

exports.findOrders = (id) => request(`orders?receipt=${encodeURIComponent(id)}&count=100`);

exports.fetchPayments = (id) => request(`orders/${encodeURIComponent(id)}/payments`);

exports.fetchPayment = (id) => request(`payments/${encodeURIComponent(id)}`);

exports.capture = (id, amount) =>
    request(`payments/${encodeURIComponent(id)}/capture`, "POST", {
        amount,
        currency: "INR",
    });

// ================== EXPIRED PAYMENT REFUND ==================
exports.refund = (paymentId, amount, orderId) =>
    request(
        `payments/${encodeURIComponent(paymentId)}/refund`,
        "POST",
        {
            amount,
            speed: "normal",
        },
        {
            "X-Refund-Idempotency": `expired-${orderId}`,
        }
    );

// ================== REFUND STATUS ==================
exports.fetchRefund = (id) => request(`refunds/${encodeURIComponent(id)}`);

// ================== CANCELLATION REFUND ==================
// Stable key protects repeated requests from duplicate refunds.
exports.refundCancellation = (paymentId, amountPaise, key) =>
    request(
        `payments/${encodeURIComponent(paymentId)}/refund`,
        "POST",
        {
            amount: amountPaise,
            speed: "normal",
        },
        {
            "X-Refund-Idempotency": key,
        }
    );
