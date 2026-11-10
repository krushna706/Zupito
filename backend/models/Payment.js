const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            unique: true,
        },
        providerOrderId: String,
        providerPaymentId: String,
        creationStarted: {
            type: Boolean,
            default: false,
        },
        refundId: String,
        refundStatus: String,
        lastFailure: {
            type: String,
            default: "",
        },
        nextCheckAt: {
            type: Date,
            default: Date.now,
        },
        lockUntil: {
            type: Date,
            default: () => new Date(0),
        },
        lockToken: String,
    },
    { timestamps: true }
);

paymentSchema.index(
    { providerOrderId: 1 },
    { unique: true, sparse: true }
);

paymentSchema.index(
    { providerPaymentId: 1 },
    { unique: true, sparse: true }
);

paymentSchema.index({ nextCheckAt: 1 });

module.exports = mongoose.model("Payment", paymentSchema);