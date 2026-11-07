const mongoose = require("mongoose");

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
        pickupAddress: {
            street: String,
            locality: String,
            city: String,
            state: String,
            pincode: String,
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
    },
    { timestamps: true }
);

module.exports = mongoose.model("SellerProfile", sellerSchema);