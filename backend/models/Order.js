const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true,
        },
        attemptId: {
            type: String,
            required: true,
            immutable: true,
        },
        quoteToken: {
            type: String,
            required: true,
            immutable: true,
        },
        cartVersion: {
            type: Number,
            required: true,
            immutable: true,
        },
        items: {
            type: [mongoose.Schema.Types.Mixed],
            required: true,
            immutable: true,
        },
        address: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
            immutable: true,
        },
        pricing: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: [
                "AwaitingPayment",
                "Confirmed",
                "Expired",
                "Refunding",
                "Refunded",
                "PaymentReview",
            ],
            default: "AwaitingPayment",
        },
        active: {
            type: Boolean,
            default: true,
        },
        reserved: {
            type: Boolean,
            default: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        confirmedAt: Date,
        cartCleared: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

orderSchema.index(
    { userId: 1, attemptId: 1 },
    { unique: true }
);

orderSchema.index(
    { userId: 1 },
    {
        unique: true,
        partialFilterExpression: { active: true },
    }
);

orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);