const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
    {
        fromStatus: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Suspended"],
            required: true,
        },
        toStatus: {
            type: String,
            enum: ["Approved", "Rejected", "Suspended"],
            required: true,
        },
        reason: {
            type: String,
            default: "",
            maxlength: 300,
        },
        changedById: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        changedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const sellerSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        storeName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        storeEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        storePhone: {
            type: String,
            required: true,
            match: /^[6-9]\d{9}$/,
        },
        description: {
            type: String,
            default: "",
            maxlength: 500,
        },
        storeLogo: {
            url: {
                type: String,
                default: "",
            },
            publicId: {
                type: String,
                select: false,
            },
        },
        pickupAddress: {
            street: String,
            locality: String,
            city: String,
            state: String,
            pincode: String,
            pickupNotes: {
                type: String,
                default: "",
                maxlength: 200,
            },
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Suspended"],
            default: "Pending",
        },
        remarks: {
            type: String,
            default: "",
            maxlength: 1000,
        },
        reviewedById: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        statusHistory: {
            type: [statusHistorySchema],
            default: [],
            select: false,
        },
    },
    { timestamps: true }
);

sellerSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("SellerProfile", sellerSchema);