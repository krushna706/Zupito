const mongoose = require("mongoose");
const schema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true, immutable: true },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        type: { type: String, enum: ["Fixed", "Percentage"], required: true },
        value: { type: Number, required: true, min: 0 },
        maxDiscount: { type: Number, default: 0, min: 0 },
        minOrder: { type: Number, required: true, min: 0 },
        scope: { type: String, default: "All Categories" },
        usageLimit: { type: Number, required: true, min: 1 },
        perCustomerLimit: { type: Number, required: true, min: 1 },
        validFrom: { type: String, required: true },
        validUntil: { type: String, required: true },
        enabled: { type: Boolean, default: true },
        usageCount: { type: Number, default: 0 },
        reservedCount: { type: Number, default: 0 },
        history: [{ action: String, note: String, date: { type: Date, default: Date.now } }],
    },
    { timestamps: true }
);
module.exports = mongoose.model("Coupon", schema);
