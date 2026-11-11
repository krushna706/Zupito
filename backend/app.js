
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
const refundRoutes = require("./routes/refundRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");

const reportRoutes = require("./routes/reportRoutes");
const settlementRoutes = require("./routes/settlementRoutes");
const replacementRoutes = require("./routes/replacementRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const couponRoutes = require("./routes/couponRoutes");

const paymentController = require("./controllers/paymentController");

const app = express();

app.disable("x-powered-by");

app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 0));

// ================== SECURITY HEADERS ==================
// Allow Razorpay checkout resources and bank-redirect popups in production.
const razorpaySources = [
    "https://razorpay.com",
    "https://*.razorpay.com",
    "https://razorpay.in",
    "https://*.razorpay.in",
    "https://*.razorpaycdn.com",
];

app.use(
    helmet({
        // Payment popups need to communicate with the checkout window.
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },

        contentSecurityPolicy:
            process.env.NODE_ENV === "production"
                ? {
                      directives: {
                          "script-src": ["'self'", ...razorpaySources],
                          "frame-src": ["'self'", ...razorpaySources],
                          "connect-src": ["'self'", ...razorpaySources],

                          // External netbanking redirects may use different bank domains.
                          "form-action": ["'self'", "https:"],

                          "img-src": ["'self'", "data:", "blob:", "https:"],
                          "style-src": ["'self'", "'unsafe-inline'", "https:"],
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

// Razorpay webhook needs the original request body.
app.post(
    "/api/payments/webhook",
    express.raw({
        type: "application/json",
        limit: "100kb",
    }),
    paymentController.webhook
);

app.use("/api", csrfMiddleware);

app.use(
    express.json({
        limit: "100kb",
    })
);

app.use(cookieParser());

// ================== HEALTH ==================
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Zupito API is running.",
    });
});

app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
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
app.use("/api/refunds", refundRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/replacements", replacementRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/delivery", deliveryRoutes);

// ================== API NOT FOUND ==================
app.use("/api", (req, res, next) => {
    next(new ExpressError(404, "API route not found."));
});

// ================== FRONTEND DEPLOYMENT ==================
if (process.env.SERVE_FRONTEND === "true") {
    const dist = path.join(__dirname, "../frontend/dist");

    app.use(express.static(dist));

    app.get("/{*path}", (req, res, next) => {
        if (path.extname(req.path)) {
            return next();
        }

        res.sendFile(path.join(dist, "index.html"));
    });
}

// ================== NOT FOUND ==================
app.use((req, res, next) => {
    next(new ExpressError(404, "Route not found."));
});

app.use(errorMiddleware);

module.exports = app;
