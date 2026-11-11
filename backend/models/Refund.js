const mongoose = require("mongoose");

const reviewEventSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["Open", "Closed"],
            required: true,
        },
        note: {
            type: String,
            required: true,
            maxlength: 300,
        },
        actorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const refundSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            immutable: true,
        },
        sellerOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerOrder",
            required: true,
            unique: true,
            immutable: true,
        },
        sellerProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerProfile",
            required: true,
            immutable: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true,
        },
        paymentId: {
            type: String,
            required: true,
            immutable: true,
        },
        amountPaise: {
            type: Number,
            required: true,
            min: 100,
            immutable: true,
        },
        productAmountPaise: {
            type: Number,
            required: true,
            min: 0,
            immutable: true,
        },
        couponSharePaise: {
            type: Number,
            required: true,
            min: 0,
            immutable: true,
        },
        deliverySharePaise: {
            type: Number,
            required: true,
            min: 0,
            immutable: true,
        },
        reason: {
            type: String,
            required: true,
            maxlength: 100,
        },
        details: {
            type: String,
            default: "",
            maxlength: 300,
        },
        idempotencyKey: {
            type: String,
            required: true,
            unique: true,
            immutable: true,
        },
        providerRefundId: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["Queued", "Pending", "Completed", "Review"],
            default: "Queued",
        },
        attempts: {
            type: Number,
            default: 0,
            min: 0,
        },
        nextCheckAt: {
            type: Date,
            default: Date.now,
        },
        lockUntil: {
            type: Date,
            default: () => new Date(0),
        },
        lockToken: String,
        lastFailure: {
            type: String,
            default: "",
        },
        processedAt: Date,
        cancelledAt: {
            type: Date,
            default: Date.now,
        },
        reviewStatus: {
            type: String,
            enum: ["Clear", "Open", "Closed"],
            default: "Clear",
        },
        reviewReason: {
            type: String,
            default: "",
            maxlength: 300,
        },
        reviewHistory: {
            type: [reviewEventSchema],
            default: [],
        },
    },
    { timestamps: true }
);

refundSchema.index({
    status: 1,
    nextCheckAt: 1,
    lockUntil: 1,
});

refundSchema.index({
    orderId: 1,
    createdAt: -1,
});

refundSchema.index({
    userId: 1,
    createdAt: -1,
});

module.exports = mongoose.model("Refund", refundSchema);
