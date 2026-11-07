const crypto = require("node:crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const AuthSession = require("../models/AuthSession");
const ExpressError = require("../utils/ExpressError");
const { cookieOptions } = require("../utils/generateToken");
const { sendPasswordResetOtpEmail } = require("../config/email");

const OTP_LIFETIME = 10 * 60 * 1000;
const RESEND_DELAY = 60 * 1000;
const REQUEST_WINDOW = 60 * 60 * 1000;
const CLEANUP_DELAY = 24 * 60 * 60 * 1000;

const hash = (value) =>
    crypto.createHash("sha256").update(value).digest("hex");

const hashOtp = (requestId, otp) =>
    crypto
        .createHmac("sha256", process.env.OTP_SECRET)
        .update(`zupito:password-reset:${requestId}:${otp}`)
        .digest("hex");

const invalidCode = () =>
    new ExpressError(
        400,
        "Invalid or expired code. Request a new code if needed."
    );

// Reserve an OTP request within the account limits.
async function reserveRequest(userId, requestId, otp) {
    const now = new Date();

    try {
        await PasswordReset.updateOne(
            { userId },
            {
                $setOnInsert: {
                    userId,
                    cleanupAt: new Date(+now + CLEANUP_DELAY),
                },
            },
            { upsert: true }
        );
    } catch (error) {
        if (error.code !== 11000) throw error;
    }

    return mongoose.connection.transaction(async (session) => {
        const reset = await PasswordReset.findOne({ userId }).session(session);

        if (!reset || reset.resendAvailableAt > now) {
            return false;
        }

        const newWindow =
            !reset.requestWindowStartedAt ||
            now - reset.requestWindowStartedAt >= REQUEST_WINDOW;

        const requests = newWindow ? 0 : reset.requestsInWindow;

        if (requests >= 10) {
            return false;
        }

        await PasswordReset.updateOne(
            { _id: reset._id },
            {
                $set: {
                    requestIdHash: hash(requestId),
                    otpHash: hashOtp(requestId, otp),
                    otpExpiresAt: new Date(+now + OTP_LIFETIME),
                    failedAttempts: 0,
                    resendAvailableAt: new Date(+now + RESEND_DELAY),
                    requestWindowStartedAt: newWindow
                        ? now
                        : reset.requestWindowStartedAt,
                    requestsInWindow: requests + 1,
                    cleanupAt: new Date(+now + CLEANUP_DELAY),
                },
                $unset: {
                    resetTokenHash: 1,
                    resetTokenExpiresAt: 1,
                },
            },
            { session, runValidators: true }
        );

        return true;
    });
}

// Request or resend an email OTP.
exports.requestPasswordResetOtp = async (req, res, next) => {
    try {
        const { identifier } = req.body;
        const requestId = crypto.randomBytes(32).toString("hex");

        const user = await User.findOne({
            ...(identifier.includes("@")
                ? { email: identifier }
                : { phone: identifier }),
            status: "Active",
        }).select("_id name email");

        if (user) {
            const otp = String(crypto.randomInt(100000, 1000000));
            const reserved = await reserveRequest(user._id, requestId, otp);

            if (reserved) {
                try {
                    await sendPasswordResetOtpEmail({
                        toEmail: user.email,
                        otp,
                        name: user.name,
                    });
                } catch {
                    // Invalidate only this failed email request.
                    await PasswordReset.updateOne(
                        {
                            userId: user._id,
                            requestIdHash: hash(requestId),
                        },
                        {
                            $unset: {
                                otpHash: 1,
                                otpExpiresAt: 1,
                            },
                        }
                    );

                    console.error("Password recovery email delivery failed.");
                }
            }
        }

        res.json({
            success: true,
            requestId,
            expiresIn: OTP_LIFETIME / 1000,
            resendAfter: RESEND_DELAY / 1000,
            message:
                "If an active account matches and recovery is available, a verification code has been sent to its registered email.",
        });
    } catch (error) {
        next(error);
    }
};

// Verify and consume the OTP once.
exports.verifyPasswordResetOtp = async (req, res, next) => {
    try {
        const { requestId, otp } = req.body;
        const resetToken = crypto.randomBytes(32).toString("hex");

        const filter = {
            requestIdHash: hash(requestId),
            otpExpiresAt: { $gt: new Date() },
            failedAttempts: { $lt: 5 },
        };

        const reset = await PasswordReset.findOneAndUpdate(
            {
                ...filter,
                otpHash: hashOtp(requestId, otp),
            },
            {
                $set: {
                    resetTokenHash: hash(resetToken),
                    resetTokenExpiresAt: new Date(Date.now() + OTP_LIFETIME),
                },
                $unset: {
                    otpHash: 1,
                    otpExpiresAt: 1,
                },
            },
            { returnDocument: "after", runValidators: true }
        );

        if (!reset) {
            await PasswordReset.updateOne(
                {
                    ...filter,
                    otpHash: { $exists: true },
                },
                { $inc: { failedAttempts: 1 } }
            );

            throw invalidCode();
        }

        res.json({
            success: true,
            resetToken,
            message: "Code verified. Set your new password.",
        });
    } catch (error) {
        next(error);
    }
};

// Update the password and invalidate previous sessions.
exports.resetPassword = async (req, res, next) => {
    try {
        const { resetToken, password } = req.body;

        const filter = {
            resetTokenHash: hash(resetToken),
            resetTokenExpiresAt: { $gt: new Date() },
        };

        // Avoid password hashing for unknown reset credentials.
        if (!(await PasswordReset.exists(filter))) {
            throw new ExpressError(
                400,
                "Reset authorization expired. Please start again."
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await mongoose.connection.transaction(async (session) => {
            const now = new Date();

            const reset = await PasswordReset.findOneAndUpdate(
                {
                    ...filter,
                    resetTokenExpiresAt: { $gt: now },
                },
                {
                    $unset: {
                        resetTokenHash: 1,
                        resetTokenExpiresAt: 1,
                        requestIdHash: 1,
                        otpHash: 1,
                        otpExpiresAt: 1,
                    },
                },
                { session, returnDocument: "before" }
            );

            if (!reset) {
                throw new ExpressError(
                    400,
                    "Reset authorization expired. Please start again."
                );
            }

            const changed = await User.updateOne(
                {
                    _id: reset.userId,
                    status: "Active",
                },
                {
                    $set: {
                        passwordHash,
                        passwordChangedAt: now,
                    },
                    $inc: { tokenVersion: 1 },
                },
                { session }
            );

            if (!changed.matchedCount) {
                throw new ExpressError(
                    400,
                    "This account cannot be reset. Please contact support."
                );
            }

            await AuthSession.updateMany(
                {
                    userId: reset.userId,
                    revokedAt: null,
                    expiresAt: { $gt: now },
                },
                {
                    $set: {
                        revokedAt: now,
                        revokeReason: "password_reset",
                    },
                },
                { session }
            );
        });

        res.clearCookie("token", cookieOptions());

        res.json({
            success: true,
            message: "Password updated. Please sign in again.",
        });
    } catch (error) {
        next(error);
    }
};