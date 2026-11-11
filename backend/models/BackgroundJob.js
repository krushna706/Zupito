const mongoose = require("mongoose");
const schema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true },
        status: { type: String, enum: ["Pending", "Running", "Review"], default: "Pending" },
        attempts: { type: Number, default: 0 },
        nextRunAt: { type: Date, default: Date.now },
        lockUntil: { type: Date, default: () => new Date(0) },
        lockToken: String,
        lastError: { type: String, default: "" },
        lastCompletedAt: Date,
    },
    { timestamps: true }
);
schema.index({ status: 1, nextRunAt: 1, lockUntil: 1 });
module.exports = mongoose.model("BackgroundJob", schema);
