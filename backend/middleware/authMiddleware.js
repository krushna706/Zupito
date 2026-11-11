const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const SellerProfile = require("../models/SellerProfile");
const ExpressError = require("../utils/ExpressError");

// Verify token and database session.
async function authMiddleware(req, res, next) {
    const token = req.cookies?.token;

    if (!token) {
        return next(new ExpressError(401, "Please sign in to continue."));
    }

    let payload;

    try {
        payload = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"],
            issuer: "zupito",
            audience: "zupito-web",
        });
    } catch {
        return next(new ExpressError(401, "Your session has expired. Please sign in again."));
    }

    if (
        !payload ||
        typeof payload !== "object" ||
        typeof payload.sub !== "string" ||
        typeof payload.sid !== "string" ||
        !mongoose.isObjectIdOrHexString(payload.sub) ||
        !mongoose.isObjectIdOrHexString(payload.sid) ||
        !Number.isInteger(payload.version) ||
        payload.version < 0 ||
        !Number.isInteger(payload.exp)
    ) {
        return next(new ExpressError(401, "Invalid session. Please sign in again."));
    }

    try {
        const [user, session] = await Promise.all([
            User.findById(payload.sub).select("+tokenVersion"),
            AuthSession.exists({
                _id: payload.sid,
                userId: payload.sub,
                revokedAt: null,
                expiresAt: { $gt: new Date() },
            }),
        ]);

        if (
            !user ||
            !session ||
            user.status !== "Active" ||
            user.tokenVersion !== payload.version
        ) {
            throw new ExpressError(401, "Your session is no longer active. Please sign in again.");
        }

        req.user = user;
        req.sessionId = payload.sid;

        next();
    } catch (error) {
        next(error);
    }
}

// Enforce role and seller approval.
function roleGuard(roles, fulfilment = false) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                throw new ExpressError(401, "Please sign in to continue.");
            }

            if (!roles.includes(req.user.role)) {
                throw new ExpressError(403, "You cannot access this resource.");
            }

            if (req.user.role === "seller") {
                const approved = await SellerProfile.exists({
                    userId: req.user._id,
                    status: fulfilment ? { $in: ["Approved", "Suspended"] } : "Approved",
                });

                if (!approved) {
                    throw new ExpressError(403, "Your seller account must be approved first.");
                }
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

const authorize = (...roles) => roleGuard(roles);
const authorizeFulfilment = (...roles) => roleGuard(roles, true);
module.exports = { authMiddleware, authorize, authorizeFulfilment };
