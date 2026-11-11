const mongoose = require("mongoose");
const schema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
        customer: { type: String, required: true },
        email: { type: String, required: true },
        phone: String,
        category: { type: String, required: true },
        subject: { type: String, required: true, maxlength: 100 },
        description: { type: String, required: true, maxlength: 1500 },
        attachment: String,
        status: {
            type: String,
            enum: ["Open", "In Progress", "Resolved", "Closed"],
            default: "Open",
        },
        replies: [
            { author: String, message: String, createdAt: { type: Date, default: Date.now } },
        ],
        history: [
            {
                action: String,
                note: String,
                date: { type: Date, default: Date.now },
                actorUserId: mongoose.Schema.Types.ObjectId,
            },
        ],
    },
    { timestamps: true }
);
schema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model("Complaint", schema);
