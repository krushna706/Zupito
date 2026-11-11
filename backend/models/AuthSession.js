const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        revokedAt: {
            type: Date,
            default: null,
        },
        revokeReason: {
            type: String,
            enum: ["", "logout", "password_reset", "admin_action"],
            default: "",
        },
    },
    { timestamps: true }
);

// Keep account session history.
sessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("AuthSession", sessionSchema);
