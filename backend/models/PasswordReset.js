const mongoose = require("mongoose");

const hiddenHash = {
    type: String,
    match: /^[a-f0-9]{64}$/,
    select: false,
};

const resetSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        requestIdHash: {
            ...hiddenHash,
            index: true,
        },
        otpHash: {
            ...hiddenHash,
        },
        otpExpiresAt: Date,
        failedAttempts: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        resendAvailableAt: Date,
        requestWindowStartedAt: Date,
        requestsInWindow: {
            type: Number,
            default: 0,
            min: 0,
            max: 10,
        },
        resetTokenHash: {
            ...hiddenHash,
            index: true,
        },
        resetTokenExpiresAt: Date,
        cleanupAt: {
            type: Date,
            required: true,
            index: { expires: 0 },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("PasswordReset", resetSchema);
