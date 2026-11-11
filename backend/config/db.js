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
        require("../models/Category").init(),
        require("../models/Product").init(),
        require("../models/StockMovement").init(),
        require("../models/Cart").init(),
        require("../models/Address").init(),
        require("../models/Order").init(),
        require("../models/Payment").init(),
        require("../models/Refund").init(),
        require("../models/SellerOrder").init(),
        require("../models/DeliveryAgentProfile").init(),
        require("../models/DeliveryTask").init(),
    ]);

    console.log("MongoDB connected");
}

module.exports = connectDB;
