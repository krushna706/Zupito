
const mongoose = require("mongoose");

const deliveryAgentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
    },
    pincodes: {
        type: [String],
        required: true,
        validate: {
            validator: (pins) =>
                pins.length > 0 &&
                pins.length <= 15 &&
                pins.every((pin) => /^[1-9]\d{5}$/.test(pin)),
            message: "Enter 1 to 15 valid pincodes.",
        },
    },
    capacity: {
        type: Number,
        min: 1,
        max: 20,
        default: 5,
    },
    activeTasks: {
        type: Number,
        min: 0,
        default: 0,
    },
    completedTasks: {
        type: Number,
        min: 0,
        default: 0,
    },
    availability: {
        type: String,
        enum: ["Available", "Unavailable"],
        default: "Available",
    },
    status: {
        type: String,
        enum: ["Active", "Suspended"],
        default: "Active",
    },
    remarks: {
        type: String,
        trim: true,
        maxlength: 300,
        default: "",
    },
}, { timestamps: true });

deliveryAgentSchema.index({
    status: 1,
    availability: 1,
    activeTasks: 1,
});

module.exports = mongoose.model(
    "DeliveryAgentProfile",
    deliveryAgentSchema
);
