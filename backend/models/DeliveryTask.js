
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now,
    },
    note: {
        type: String,
        required: true,
        maxlength: 300,
    },
    actorUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, { _id: false });

const deliveryTaskSchema = new mongoose.Schema({
    sellerOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SellerOrder",
        required: true,
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
    },
    kind: {
        type: String,
        enum: [
            "original",
            "replacement_pickup",
            "replacement_delivery",
        ],
        default: "original",
    },
    operationKey: {
        type: String,
        required: true,
        unique: true,
        immutable: true,
    },
    agentProfileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeliveryAgentProfile",
        default: null,
    },
    product: {
        type: String,
        default: "Order Parcel",
        maxlength: 250,
    },
    seller: {
        type: String,
        default: "Seller",
    },
    pickupAddress: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    customerAddress: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    pickupPincode: {
        type: String,
        required: true,
        match: /^[1-9]\d{5}$/,
    },
    deliveryPincode: {
        type: String,
        required: true,
        match: /^[1-9]\d{5}$/,
    },
    stage: {
        type: String,
        enum: [
            "ready_for_pickup",
            "assigned",
            "picked_up",
            "out_for_delivery",
            "failed",
            "delivered",
            "cancelled",
        ],
        default: "ready_for_pickup",
    },
    custody: {
        type: String,
        enum: ["Seller", "Agent", "Customer"],
        default: "Seller",
    },
    assignmentMode: {
        type: String,
        enum: ["Auto", "Manual", "Override", null],
        default: null,
    },
    assignedAt: Date,
    pickedUpAt: Date,
    outForDeliveryAt: Date,
    deliveredAt: Date,
    failedFrom: String,
    failureReason: {
        type: String,
        default: "",
    },
    failureNote: {
        type: String,
        default: "",
    },
    lastFailedAt: Date,
    retryAt: Date,
    attempts: {
        type: Number,
        min: 0,
        default: 0,
    },
    escalatedToAdmin: {
        type: Boolean,
        default: false,
    },
    otpHash: {
        type: String,
        select: false,
    },
    otpCiphertext: {
        type: String,
        select: false,
    },
    otpExpiresAt: Date,
    otpIssuedAt: Date,
    otpAttempts: {
        type: Number,
        min: 0,
        default: 0,
    },
    otpRegenerations: {
        type: Number,
        min: 0,
        default: 0,
    },
    events: {
        type: [eventSchema],
        default: [],
    },
}, { timestamps: true });

deliveryTaskSchema.index({
    agentProfileId: 1,
    createdAt: -1,
});

deliveryTaskSchema.index({
    stage: 1,
    retryAt: 1,
    createdAt: 1,
});

deliveryTaskSchema.index({
    orderId: 1,
    sellerOrderId: 1,
});

module.exports = mongoose.model(
    "DeliveryTask",
    deliveryTaskSchema
);
