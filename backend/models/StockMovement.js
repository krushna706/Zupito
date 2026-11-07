const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
    {
        sellerProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerProfile",
            required: true,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        variantId: { type: String, required: true },
        sku: { type: String, required: true },
        type: {
            type: String,
            enum: ["Opening", "Restock", "Adjustment", "Damage/Loss"],
            required: true,
        },
        beforeQuantity: { type: Number, required: true },
        quantityChange: { type: Number, required: true },
        afterQuantity: { type: Number, required: true },
        reason: { type: String, required: true },
        note: { type: String, default: "", maxlength: 300 },
        reference: { type: String, default: "", maxlength: 80 },
        source: {
            type: String,
            enum: ["product_form", "manual", "csv"],
            default: "product_form",
        },
        operationKey: {
            type: String,
            maxlength: 150,
        },
        requestHash: {
            type: String,
            select: false,
        },
        actorUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({
    sellerProfileId: 1,
    productId: 1,
    variantId: 1,
    createdAt: -1,
});

stockMovementSchema.index(
    { sellerProfileId: 1, operationKey: 1 },
    {
        unique: true,
        partialFilterExpression: {
            operationKey: { $type: "string" },
        },
    }
);

module.exports = mongoose.model("StockMovement", stockMovementSchema);