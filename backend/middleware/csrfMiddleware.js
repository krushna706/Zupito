const ExpressError = require("../utils/ExpressError");

module.exports = (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }

    let origin = req.get("origin");

    if (!origin && req.get("referer")) {
        try {
            origin = new URL(req.get("referer")).origin;
        } catch {
            // Invalid referers are rejected below.
        }
    }

    if (origin !== process.env.CLIENT_ORIGIN) {
        return next(new ExpressError(403, "Request origin is not allowed."));
    }

    next();
};