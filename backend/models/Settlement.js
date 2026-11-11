const mongoose = require("mongoose");
const schema = new mongoose.Schema(
    {
        sellerProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerProfile",
            required: true,
        },
        sellerOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerOrder",
            required: true,
            unique: true,
        },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
        batch: { type: String, required: true },
        grossPaise: { type: Number, required: true },
        discountPaise: { type: Number, required: true },
        commissionPaise: { type: Number, required: true },
        payablePaise: { type: Number, required: true },
        commissionBps: { type: Number, required: true },
        status: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
        reference: { type: String, default: "", maxlength: 100 },
        paidAt: Date,
        confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);
schema.index({ sellerProfileId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model("Settlement", schema);
