const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
    },
    phone: {
        type: String,
        required: true,
        match: /^[6-9]\d{9}$/,
    },
    pincode: {
        type: String,
        required: true,
        match: /^[1-9]\d{5}$/,
    },
    house: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
    },
    area: {
        type: String,
        required: true,
        trim: true,
        maxlength: 150,
    },
    city: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
    },
    state: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
    },
    landmark: {
        type: String,
        default: "",
        trim: true,
        maxlength: 150,
    },
    type: {
        type: String,
        enum: ["Home", "Work", "Other"],
        default: "Home",
    },
});

const addressBookSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        addresses: {
            type: [addressSchema],
            default: [],
        },
        selectedId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Address", addressBookSchema);