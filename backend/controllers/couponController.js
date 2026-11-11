const Coupon = require("../models/Coupon");
const schema = require("../validations/schema");
const mongoose = require("mongoose");
const ExpressError = require("../utils/ExpressError");
const dto = (row) => ({ ...row, id: String(row._id) });
exports.list = async (req, res, next) => {
    try {
        res.json({
            coupons: (await Coupon.find().sort({ createdAt: -1 }).limit(1000).lean()).map(dto),
        });
    } catch (error) {
        next(error);
    }
};
exports.save = async (req, res, next) => {
    try {
        const { value, error } = schema.couponSchema.validate(req.body);
        if (error) throw new ExpressError(400, error.details[0].message);
        if (
            value.validUntil < value.validFrom ||
            (value.type === "Percentage" && (value.value > 100 || !value.maxDiscount))
        ) {
            throw new ExpressError(400, "Check coupon dates, percentage and maximum discount.");
        }
        if (req.params.id && !mongoose.isObjectIdOrHexString(req.params.id))
            throw new ExpressError(400, "Invalid coupon ID.");
        const row = await mongoose.connection.transaction(async (session) => {
            const row = req.params.id
                ? await Coupon.findById(req.params.id).session(session)
                : new Coupon(value);
            if (!row) throw new ExpressError(404, "Coupon not found.");
            if (req.params.id && row.code !== value.code)
                throw new ExpressError(
                    409,
                    "Coupon codes cannot be renamed. Create a new campaign."
                );
            if (value.usageLimit < row.usageCount + row.reservedCount)
                throw new ExpressError(409, "Usage limit is below committed redemptions.");
            for (const date of [value.validFrom, value.validUntil]) {
                const parsed = new Date(date);
                if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)
                    throw new ExpressError(400, "Enter valid calendar dates.");
            }
            Object.assign(row, value);
            row.history.push({
                action: req.params.id ? "Updated" : "Created",
                note: "Campaign configuration saved.",
            });
            await row.save({ session });
            return row;
        });
        res.json({ coupon: dto(row.toObject()) });
    } catch (error) {
        next(error);
    }
};
exports.status = async (req, res, next) => {
    try {
        const { value, error } = schema.couponStatusSchema.validate(req.body);
        if (error || !mongoose.isObjectIdOrHexString(req.params.id))
            throw new ExpressError(400, "Invalid coupon update.");
        const row = await Coupon.findByIdAndUpdate(
            req.params.id,
            {
                $set: { enabled: value.enabled },
                $push: {
                    history: { action: value.enabled ? "Enabled" : "Paused", note: value.reason },
                },
            },
            { returnDocument: "after", runValidators: true }
        );
        if (!row) throw new ExpressError(404, "Coupon not found.");
        res.json({ coupon: dto(row.toObject()) });
    } catch (error) {
        next(error);
    }
};
