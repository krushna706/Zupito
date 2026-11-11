const mongoose = require("mongoose");
const schema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
        itemIndex: { type: Number, required: true },
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        sellerProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerProfile",
            required: true,
        },
        customerName: { type: String, required: true },
        productName: String,
        image: String,
        rating: { type: Number, min: 1, max: 5, required: true },
        sellerReply: { text: String, storeName: String, updatedAt: Date },
        comment: { type: String, maxlength: 800, default: "" },
        status: { type: String, enum: ["Published", "Flagged", "Hidden"], default: "Published" },
        moderationReason: { type: String, default: "" },
        moderationHistory: [
            {
                from: String,
                to: String,
                reason: String,
                date: Date,
                actorUserId: mongoose.Schema.Types.ObjectId,
            },
        ],
    },
    { timestamps: true }
);
schema.index({ userId: 1, orderId: 1, itemIndex: 1 }, { unique: true });
schema.index({ productId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model("Review", schema);
