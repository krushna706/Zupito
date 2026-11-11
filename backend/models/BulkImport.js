const mongoose = require("mongoose");
const schema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        reference: { type: String, required: true },
        hash: { type: String, required: true },
        kind: { type: String, enum: ["stock", "catalog"], required: true },
        options: { type: mongoose.Schema.Types.Mixed, required: true },
        rows: { type: [mongoose.Schema.Types.Mixed], required: true, select: false },
        results: { type: [mongoose.Schema.Types.Mixed], default: [] },
        cursor: { type: Number, default: 0 },
        count: { type: Number, required: true },
        status: { type: String, enum: ["Pending", "Completed"], default: "Pending" },
    },
    { timestamps: true }
);
schema.index({ userId: 1, reference: 1 }, { unique: true });
schema.index({ status: 1, createdAt: 1 });
module.exports = mongoose.model("BulkImport", schema);
