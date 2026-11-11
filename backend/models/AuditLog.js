const mongoose = require("mongoose");
const schema = new mongoose.Schema(
    {
        actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        action: { type: String, required: true, maxlength: 80 },
        resourceId: { type: String, required: true, maxlength: 100 },
        note: { type: String, default: "", maxlength: 500 },
    },
    { timestamps: true }
);
schema.index({ resourceId: 1, createdAt: -1 });
module.exports = mongoose.model("AuditLog", schema);
