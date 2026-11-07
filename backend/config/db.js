const mongoose = require("mongoose");

async function connectDB() {
    await mongoose.connect(process.env.DB_URI, {
        serverSelectionTimeoutMS: 10000,
    });

    await Promise.all([
        require("../models/User").init(),
        require("../models/AuthSession").init(),
        require("../models/PasswordReset").init(),
        require("../models/SellerProfile").init(),
    ]);

    console.log("MongoDB connected");
}

module.exports = connectDB;