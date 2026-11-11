const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
    {
        variantId: { type: String, required: true },
        sku: { type: String, required: true, uppercase: true },
        label: { type: String, required: true, maxlength: 80 },
        pricePaise: { type: Number, required: true, min: 1 },
        mrpPaise: { type: Number, required: true, min: 1 },
        stock: { type: Number, required: true, min: 0 },
        reservedQuantity: { type: Number, default: 0, min: 0 },
        imageIndex: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);

const productSchema = new mongoose.Schema(
    {
        sellerProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SellerProfile",
            required: true,
            immutable: true,
        },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },
        ratingSum: { type: Number, default: 0 },
        ratingCount: { type: Number, default: 0 },
        productCode: {
            type: String,
            required: true,
            unique: true,
            immutable: true,
        },
        name: { type: String, required: true, maxlength: 150 },
        brand: { type: String, required: true, maxlength: 80 },
        description: { type: String, required: true, maxlength: 5000 },
        highlights: { type: [String], default: [] },
        specifications: {
            type: [
                {
                    _id: false,
                    label: String,
                    value: String,
                },
            ],
            default: [],
        },
        images: {
            type: [
                {
                    _id: false,
                    url: { type: String, required: true },
                    publicId: { type: String, required: true },
                },
            ],
            required: true,
        },
        variants: {
            type: [variantSchema],
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Suspended"],
            default: "Pending",
        },
        moderationReason: { type: String, default: "" },
        reviewType: {
            type: String,
            enum: ["New Listing", "Content Update"],
            default: "New Listing",
        },
        submittedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date, default: null },
        reviewedById: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        moderationHistory: {
            type: [
                {
                    _id: false,

                    action: {
                        type: String,
                        enum: ["Approve", "Reject", "Suspend", "Reactivate"],
                        required: true,
                    },

                    fromStatus: {
                        type: String,
                        required: true,
                    },

                    toStatus: {
                        type: String,
                        required: true,
                    },

                    reason: {
                        type: String,
                        default: "",
                        maxlength: 300,
                    },

                    reviewedVersion: {
                        type: Number,
                        required: true,
                    },

                    changedById: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "User",
                        required: true,
                    },

                    changedAt: {
                        type: Date,
                        default: Date.now,
                    },
                },
            ],

            default: [],
            select: false,
        },
    },
    { timestamps: true }
);

productSchema.index({ sellerProfileId: 1, "variants.sku": 1 }, { unique: true });
productSchema.index({ sellerProfileId: 1, status: 1, createdAt: -1 });
productSchema.index({ categoryId: 1, status: 1 });

module.exports = mongoose.model("Product", productSchema);
