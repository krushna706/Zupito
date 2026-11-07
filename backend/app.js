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

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 0));

app.use(
    helmet({
        contentSecurityPolicy:
            process.env.NODE_ENV === "production"
                ? {
                      directives: {
                          "img-src": ["'self'", "data:", "blob:", "https:"],
                          "style-src": ["'self'", "'unsafe-inline'", "https:"],
                      },
                  }
                : false,
    })
);

app.use(
    cors({
        origin: process.env.CLIENT_ORIGIN,
        credentials: true,
        exposedHeaders: ["Retry-After"],
    })
);

app.use("/api", csrfMiddleware);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Zupito API is running.",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/seller", sellerRoutes);

app.use("/api", (req, res, next) => {
    next(new ExpressError(404, "API route not found."));
});

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

app.use((req, res, next) => {
    next(new ExpressError(404, "Route not found."));
});

app.use(errorMiddleware);

module.exports = app;