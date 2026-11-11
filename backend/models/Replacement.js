const mongoose = require("mongoose");

const schema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
        sellerOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "SellerOrder", required: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        sellerProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerProfile",
            required: true,
        },
        itemIndex: { type: Number, required: true },
        item: { type: mongoose.Schema.Types.Mixed, required: true },
        quantity: { type: Number, min: 1, required: true },
        reason: { type: String, required: true },
        description: { type: String, maxlength: 1000, default: "" },
        images: [{ url: String, publicId: { type: String, select: false } }],
        address: { type: mongoose.Schema.Types.Mixed, required: true },
        deliveredAt: { type: Date, required: true },
        deadline: { type: Date, required: true },
        status: {
            type: String,
            enum: [
                "Requested",
                "Approved",
                "Return In Transit",
                "Awaiting Inspection",
                "Inspection Failed",
                "Inspection Passed",
                "Ready for Pickup",
                "Replacement Shipped",
                "Completed",
                "Rejected",
            ],
            default: "Requested",
        },
        stockReserved: { type: Boolean, default: false },
        returnedRestocked: { type: Boolean, default: false },
        remark: { type: String, default: "" },
        history: [
            {
                status: String,
                note: String,
                date: { type: Date, default: Date.now },
                actorUserId: mongoose.Schema.Types.ObjectId,
            },
        ],
    },
    { timestamps: true }
);
// One request per purchased line prevents duplicate replacement reservations.
schema.index({ orderId: 1, itemIndex: 1 }, { unique: true });
schema.index({ sellerProfileId: 1, status: 1, createdAt: -1 });
module.exports = mongoose.model("Replacement", schema);
