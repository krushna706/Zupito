const mongoose = require("mongoose");

const statusHistorySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["Active", "Disabled"],
            required: true,
        },
        reason: {
            type: String,
            default: "",
            maxlength: 300,
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
    { _id: false }
);

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 70,
        },
        nameKey: {
            type: String,
            required: true,
            select: false,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            immutable: true,
        },
        parentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            default: null,
            immutable: true,
        },
        description: {
            type: String,
            default: "",
            maxlength: 240,
        },
        sortOrder: {
            type: Number,
            default: 1,
            min: 1,
            max: 999,
        },
        attributes: {
            type: [String],
            default: [],
        },
        replacementAllowed: {
            type: Boolean,
            default: false,
        },
        replacementDays: {
            type: Number,
            default: 0,
            min: 0,
            max: 30,
        },
        status: {
            type: String,
            enum: ["Active", "Disabled"],
            default: "Active",
        },
        remarks: {
            type: String,
            default: "",
            maxlength: 300,
        },
        createdById: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        updatedById: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        statusHistory: {
            type: [statusHistorySchema],
            default: [],
            select: false,
        },
    },
    { timestamps: true }
);

categorySchema.index({ parentId: 1, nameKey: 1 }, { unique: true });
categorySchema.index({ status: 1, sortOrder: 1 });

module.exports = mongoose.model("Category", categorySchema);