const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("../models/User");
const SellerProfile = require("../models/SellerProfile");
const AuthSession = require("../models/AuthSession");
const ExpressError = require("../utils/ExpressError");

const {
    generateToken,
    cookieOptions,
    SESSION_MAX_AGE,
} = require("../utils/generateToken");

const dummyHash = bcrypt.hashSync("unregistered-account-timing-check", 12);

// Return public account fields.
async function userResponse(user) {
    const seller = user.role === "seller"
        ? await SellerProfile.findOne({ userId: user._id }).lean()
        : null;

    return {
        id: String(user._id),
        _id: String(user._id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatar: {
            url: user.avatar?.url || "",
        },
        createdAt: user.createdAt,
        seller: seller
            ? {
                  id: String(seller._id),
                  storeName: seller.storeName,
                  storeEmail: seller.storeEmail,
                  storePhone: seller.storePhone,
                  description: seller.description,
                  pickupAddress: seller.pickupAddress,
                  status: seller.status,
                  remarks: seller.remarks,
                  createdAt: seller.createdAt,
              }
            : null,
    };
}

// Customer signup
exports.signup = async (req, res, next) => {
    try {
        const { name, email, phone, password } = req.body;

        await User.create({
            name,
            email,
            phone,
            passwordHash: await bcrypt.hash(password, 12),
            role: "customer",
        });

        res.status(201).json({
            success: true,
            message: "Account created. Please sign in.",
        });
    } catch (error) {
        next(error);
    }
};

// Seller account and application
exports.registerSeller = async (req, res, next) => {
    try {
        const {
            fullName, email, mobile, password,
            storeName, storeEmail, storePhone, description,
            street, locality, city, state, pincode,
        } = req.body;

        const passwordHash = await bcrypt.hash(password, 12);

        await mongoose.connection.transaction(async (session) => {
            const [user] = await User.create(
                [{
                    name: fullName,
                    email,
                    phone: mobile,
                    passwordHash,
                    role: "seller",
                }],
                { session }
            );

            await SellerProfile.create(
                [{
                    userId: user._id,
                    storeName,
                    storeEmail,
                    storePhone,
                    description,
                    pickupAddress: {
                        street,
                        locality,
                        city,
                        state,
                        pincode,
                    },
                }],
                { session }
            );
        });

        res.status(201).json({
            success: true,
            message: "Application submitted. You can sign in to track approval.",
        });
    } catch (error) {
        next(error);
    }
};

// Login and create a session
exports.login = async (req, res, next) => {
    try {
        const { identifier, password } = req.body;

        const user = await User.findOne(
            identifier.includes("@")
                ? { email: identifier }
                : { phone: identifier }
        ).select("+passwordHash +tokenVersion");

        const valid = await bcrypt.compare(
            password,
            user?.passwordHash || dummyHash
        );

        if (!user || !valid) {
            throw new ExpressError(
                401,
                "Incorrect email, phone number or password."
            );
        }

        if (user.status !== "Active") {
            throw new ExpressError(
                403,
                "This account is inactive. Please contact support."
            );
        }

        const data = await userResponse(user);

        const session = await AuthSession.create({
            userId: user._id,
            expiresAt: new Date(Date.now() + SESSION_MAX_AGE),
        });

        res.cookie("token", generateToken(user, session), {
            ...cookieOptions(),
            maxAge: SESSION_MAX_AGE,
        });

        res.json({
            success: true,
            message: "Signed in successfully.",
            user: data,
        });
    } catch (error) {
        next(error);
    }
};

// Restore the authenticated account.
exports.getCurrentUser = async (req, res, next) => {
    try {
        res.json({
            success: true,
            user: await userResponse(req.user),
        });
    } catch (error) {
        next(error);
    }
};

// Revoke this session and retain its history.
exports.logout = async (req, res, next) => {
    try {
        await AuthSession.updateOne(
            {
                _id: req.sessionId,
                userId: req.user._id,
                revokedAt: null,
            },
            {
                $set: {
                    revokedAt: new Date(),
                    revokeReason: "logout",
                },
            }
        );

        res.clearCookie("token", cookieOptions());

        res.json({
            success: true,
            message: "Logged out successfully.",
        });
    } catch (error) {
        next(error);
    }
};