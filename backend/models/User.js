const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
        },
        phone: {
            type: String,
            required: true,
            match: /^[6-9]\d{9}$/,
            unique: true,
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: ["customer", "admin", "seller", "delivery"],
            default: "customer",
        },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
        },
        tokenVersion: {
            type: Number,
            default: 0,
            select: false,
        },
        passwordChangedAt: Date,
        avatar: {
            url: {
                type: String,
                default: "",
            },
            publicId: {
                type: String,
                select: false,
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
