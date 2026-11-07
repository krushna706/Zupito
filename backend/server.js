require("dotenv").config({
    path: require("path").join(__dirname, ".env"),
});

const connectDB = require("./config/db");

async function startServer() {
    for (const key of [
        "DB_URI",
        "JWT_SECRET",
        "OTP_SECRET",
        "CLIENT_ORIGIN",
    ]) {
        if (!process.env[key]) {
            throw new Error(`${key} is required in backend/.env`);
        }
    }

    if (
        process.env.JWT_SECRET.length < 32 ||
        process.env.OTP_SECRET.length < 32
    ) {
        throw new Error(
            "JWT_SECRET and OTP_SECRET must contain at least 32 random characters."
        );
    }

    const origin = new URL(process.env.CLIENT_ORIGIN);

    if (
        !["http:", "https:"].includes(origin.protocol) ||
        origin.origin !== process.env.CLIENT_ORIGIN
    ) {
        throw new Error(
            "CLIENT_ORIGIN must be an exact HTTP/HTTPS origin without a trailing slash."
        );
    }

    if (
        process.env.NODE_ENV === "production" &&
        origin.protocol !== "https:"
    ) {
        throw new Error("Production requires HTTPS.");
    }

    const hops = Number(process.env.TRUST_PROXY_HOPS || 0);
    const port = Number(process.env.PORT || 5000);

    if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
        throw new Error("Invalid TRUST_PROXY_HOPS.");
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("Invalid PORT.");
    }

    await connectDB();

    const app = require("./app");

    app.listen(port, () => {
        console.log(`Zupito API listening on port ${port}`);
    });
}

startServer().catch((error) => {
    console.error(
        "Startup failed:",
        error.name === "Error" ? error.message : error.name
    );

    process.exit(1);
});