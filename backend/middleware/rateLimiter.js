const { createHash } = require("node:crypto");
const { rateLimit } = require("express-rate-limit");

const User = require("../models/User");

const createLimiter = (limit, windowMs, options = {}) =>
    rateLimit({
        windowMs,
        limit,
        standardHeaders: "draft-8",
        legacyHeaders: false,

        handler: (req, res) => {
            const resetTime = req.rateLimit?.resetTime;
            const remaining = resetTime
                ? Number(resetTime) - Date.now()
                : windowMs;

            const retryAfter = Math.max(1, Math.ceil(remaining / 1000));

            res.set("Retry-After", String(retryAfter));

            res.status(429).json({
                success: false,
                message: "Too many attempts. Please try again later.",
                retryAfter,
            });
        },

        ...options,
    });

exports.loginIpLimiter = createLimiter(30, 15 * 60 * 1000);

exports.loginAccountLimiter = createLimiter(10, 15 * 60 * 1000, {
    skipSuccessfulRequests: true,

    keyGenerator: async (req) => {
        const { identifier } = req.body;

        const user = await User.findOne(
            identifier.includes("@")
                ? { email: identifier }
                : { phone: identifier }
        ).select("_id").lean();

        const key = user
            ? `account:${user._id}`
            : `identifier:${identifier}`;

        return createHash("sha256").update(key).digest("hex");
    },
});

exports.signupLimiter = createLimiter(10, 60 * 60 * 1000);
exports.resetRequestLimiter = createLimiter(30, 60 * 60 * 1000);
exports.resetVerifyLimiter = createLimiter(60, 15 * 60 * 1000);
exports.resetPasswordLimiter = createLimiter(20, 15 * 60 * 1000);

exports.profileUpdateLimiter = createLimiter(10, 15 * 60 * 1000, {
    keyGenerator: (req) => String(req.user._id),
});