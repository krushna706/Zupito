
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const csrfMiddleware = require("./middleware/csrfMiddleware");
const errorMiddleware = require("./middleware/errorMiddleware");
const ExpressError = require("./utils/ExpressError");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const adminRoutes = require("./routes/adminRoutes");
const sellerRoutes = require("./routes/sellerRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const checkoutRoutes = require("./routes/checkoutRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");

const paymentController = require("./controllers/paymentController");

const app = express();

app.disable("x-powered-by");
app.set(
    "trust proxy",
    Number(process.env.TRUST_PROXY_HOPS || 0)
);

// ================== SECURITY HEADERS ==================
app.use(
    helmet({
        contentSecurityPolicy:
            process.env.NODE_ENV === "production"
                ? {
                    directives: {
                        "script-src": [
                            "'self'",
                            "https://checkout.razorpay.com",
                        ],
                        "frame-src": [
                            "'self'",
                            "https://api.razorpay.com",
                            "https://checkout.razorpay.com",
                        ],
                        "connect-src": [
                            "'self'",
                            "https://api.razorpay.com",
                            "https://lumberjack.razorpay.com",
                        ],
                        "img-src": [
                            "'self'",
                            "data:",
                            "blob:",
                            "https:",
                        ],
                        "style-src": [
                            "'self'",
                            "'unsafe-inline'",
                            "https:",
                        ],
                    },
                }
                : false,
    })
);

// ================== CORS ==================
app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN,
        credentials: true,
        exposedHeaders: ["Retry-After"],
    })
);

// Razorpay signature verification uses the original raw body.
app.post(
    "/api/payments/webhook",
    express.raw({
        type: "application/json",
        limit: "100kb",
    }),
    paymentController.webhook
);

app.use("/api", csrfMiddleware);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// ================== HEALTH ==================
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Zupito API is running.",
    });
});

// ================== API ROUTES ==================
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryRoutes);

// ================== API NOT FOUND ==================
app.use("/api", (req, res, next) => {
    next(new ExpressError(404, "API route not found."));
});

// ================== FRONTEND DEPLOYMENT ==================
if (process.env.SERVE_FRONTEND === "true") {
    const dist = path.join(
        __dirname,
        "../frontend/dist"
    );

    app.use(express.static(dist));

    app.get("/{*path}", (req, res, next) => {
        if (path.extname(req.path)) {
            return next();
        }

        res.sendFile(
            path.join(dist, "index.html")
        );
    });
}

app.use((req, res, next) => {
    next(new ExpressError(404, "Route not found."));
});

app.use(errorMiddleware);

module.exports = app;
