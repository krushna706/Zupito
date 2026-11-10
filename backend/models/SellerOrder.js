const mongoose = require("mongoose");

const sellerOrderSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            immutable: true,
        },
        sellerProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerProfile",
            required: true,
            immutable: true,
        },
        itemIndexes: {
            type: [Number],
            required: true,
            immutable: true,
        },
        status: {
            type: String,
            enum: [
                "Confirmed",
                "Packing",
                "Ready for Pickup",
                "Shipped",
                "Delivered",
                "Cancelled",
            ],
            default: "Confirmed",
        },
        confirmedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

sellerOrderSchema.index(
    { orderId: 1, sellerProfileId: 1 },
    { unique: true }
);

sellerOrderSchema.index({
    sellerProfileId: 1,
    status: 1,
    createdAt: -1,
});

module.exports = mongoose.model("SellerOrder", sellerOrderSchema);