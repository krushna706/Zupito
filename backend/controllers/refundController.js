const Joi = require("joi");
const mongoose = require("mongoose");

const Refund = require("../models/Refund");
const Order = require("../models/Order");
const ExpressError = require("../utils/ExpressError");
const refundService = require("../services/refundService");

// ================== CUSTOMER CANCELLATION ==================
exports.cancel = async (req, res, next) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) {
            throw new ExpressError(400, "Invalid order ID.");
        }

        const schema = Joi.object({
            parcelIds: Joi.array()
                .items(Joi.string().hex().length(24))
                .min(1)
                .max(25)
                .unique()
                .required(),

            reason: Joi.string()
                .valid(
                    "Ordered by mistake",
                    "Changed my mind",
                    "Delivery taking too long",
                    "Found a better option",
                    "Other"
                )
                .required(),

            details: Joi.string().trim().max(300).allow("").default(""),
        });

        const { value, error } = schema.validate(req.body, {
            allowUnknown: false,
        });

        if (error) {
            throw new ExpressError(400, error.details[0].message);
        }

        if (value.reason === "Other" && value.details.length < 5) {
            throw new ExpressError(400, "Explain the cancellation in at least 5 characters.");
        }

        const refunds = await refundService.cancel(
            req.user._id,
            req.params.id,
            value.parcelIds,
            value.reason,
            value.details
        );

        res.json({
            success: true,
            message: "Parcel cancelled. Refund processing queued.",
            refunds,
        });
    } catch (error) {
        next(error);
    }
};

// ================== ADMIN REFUNDS ==================
exports.list = async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);

        if (!Number.isInteger(page) || page < 1 || page > 10000) {
            throw new ExpressError(400, "Invalid page.");
        }

        const rows = await Refund.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * 50)
            .limit(50)
            .lean();

        const orders = await Order.find({
            _id: {
                $in: rows.map((row) => row.orderId),
            },
        })
            .select("_id address.name")
            .lean();

        const names = new Map(orders.map((order) => [String(order._id), order.address?.name]));

        res.json({
            refunds: rows.map((row) => ({
                ...refundService.publicRefund(row),
                customerName: names.get(String(row.orderId)) || "Customer",
            })),
            hasMore: page * 50 < (await Refund.countDocuments()),
        });
    } catch (error) {
        next(error);
    }
};

// ================== ADMIN REVIEW ==================
exports.review = async (req, res, next) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id)) {
            throw new ExpressError(400, "Invalid refund ID.");
        }

        const schema = Joi.object({
            status: Joi.string().valid("Open", "Closed").required(),
            note: Joi.string().trim().min(5).max(300).required(),
        });

        const { value, error } = schema.validate(req.body, {
            allowUnknown: false,
        });

        if (error) {
            throw new ExpressError(400, error.details[0].message);
        }

        const row = await Refund.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    reviewStatus: value.status,
                    reviewReason: value.note,
                },
                $push: {
                    reviewHistory: {
                        status: value.status,
                        note: value.note,
                        actorUserId: req.user._id,
                        date: new Date(),
                    },
                },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!row) {
            throw new ExpressError(404, "Refund record not found.");
        }

        res.json({
            refund: refundService.publicRefund(row),
        });
    } catch (error) {
        next(error);
    }
};

// Resume the same provider transaction/key; never create a second refund key.
exports.retry = async (req, res, next) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id))
            throw new ExpressError(400, "Invalid refund ID.");
        const { value, error } = Joi.object({
            note: Joi.string().trim().min(5).max(300).required(),
        }).validate(req.body);
        if (error) throw new ExpressError(400, error.details[0].message);
        const row = await Refund.findOneAndUpdate(
            {
                _id: req.params.id,
                status: "Review",
                lockUntil: { $lte: new Date() },
            },
            {
                $set: {
                    status: "Pending",
                    attempts: 0,
                    nextCheckAt: new Date(),
                    reviewStatus: "Open",
                },
                $push: {
                    reviewHistory: {
                        status: "Open",
                        note: `Reconciliation requested: ${value.note}`,
                        actorUserId: req.user._id,
                    },
                },
            },
            { returnDocument: "after" }
        );
        if (!row)
            throw new ExpressError(
                409,
                "Refund is not awaiting recovery or is already processing."
            );
        res.json({ refund: refundService.publicRefund(row) });
    } catch (error) {
        next(error);
    }
};
