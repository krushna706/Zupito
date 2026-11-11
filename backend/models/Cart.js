const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variantId: {
            type: String,
            required: true,
            maxlength: 80,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
            max: 99,
        },
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        items: {
            type: [cartItemSchema],
            default: [],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
