const mongoose = require("mongoose");

const historySchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ["Packing", "Ready for Pickup"],
        required: true,
    },
    note: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
    },
    actorUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
}, { _id: false });

const sellerOrderSchema = new mongoose.Schema({
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
    packingAt: Date,
    readyForPickupAt: Date,
    history: {
        type: [historySchema],
        default: [],
    },
}, { timestamps: true });

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