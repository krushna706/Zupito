const Joi = require("joi");
const mongoose = require("mongoose");
const Replacement = require("../models/Replacement");
const SellerProfile = require("../models/SellerProfile");
const DeliveryTask = require("../models/DeliveryTask");
const service = require("../services/replacementService");
const otp = require("../services/deliveryOtpService");
const ExpressError = require("../utils/ExpressError");
const schema = Joi.object({
    orderId: Joi.string().hex().length(24).required(),
    orderItemId: Joi.string().max(40).required(),
    quantity: Joi.number().integer().min(1).max(100).required(),
    reason: Joi.string()
        .valid(
            "Damaged item",
            "Defective or not working",
            "Wrong item received",
            "Missing parts or accessories",
            "Other"
        )
        .required(),
    description: Joi.string().trim().max(1000).allow("").default(""),
});
exports.create = async (req, res, next) => {
    const uploads = [];
    try {
        const { value, error } = schema.validate(req.body);
        if (error) throw new ExpressError(400, error.details[0].message);
        if (value.reason === "Other" && value.description.length < 10)
            throw new ExpressError(400, "Describe the issue in at least 10 characters.");
        for (const file of req.files || []) {
            const result = await new Promise((resolve, reject) => {
                const stream = require("../config/cloudinary").uploader.upload_stream(
                    { folder: "zupito/replacements" },
                    (error, result) => (error ? reject(error) : resolve(result))
                );
                stream.end(file.buffer);
            });
            uploads.push({ url: result.secure_url, publicId: result.public_id });
        }
        await service.request(req.user._id, value, uploads);
        res.status(201).json({ success: true });
    } catch (error) {
        await Promise.allSettled(
            uploads.map((image) => require("../config/cloudinary").uploader.destroy(image.publicId))
        );
        next(
            error.code === 11000
                ? new ExpressError(409, "A replacement request already exists for this item.")
                : error
        );
    }
};
exports.list = async (req, res, next) => {
    try {
        const filter = {};
        if (req.user.role === "customer") filter.userId = req.user._id;
        if (req.user.role === "seller") {
            const seller = await SellerProfile.findOne({ userId: req.user._id })
                .select("_id")
                .lean();
            if (!seller) throw new ExpressError(403, "Seller profile required.");
            filter.sellerProfileId = seller._id;
        }
        if (req.query.orderId) {
            if (!mongoose.isObjectIdOrHexString(req.query.orderId))
                throw new ExpressError(400, "Invalid order.");
            filter.orderId = req.query.orderId;
        }
        const rows = await Replacement.find(filter).sort({ createdAt: -1 }).limit(500).lean();
        res.json({ replacements: rows.map((row) => ({ ...row, id: String(row._id) })) });
    } catch (error) {
        next(error);
    }
};
exports.change = async (req, res, next) => {
    try {
        const { value, error } = Joi.object({
            action: Joi.string()
                .valid("approve", "reject", "reopen", "inspect_pass", "inspect_fail", "ready")
                .required(),
            note: Joi.string().trim().min(5).max(300).required(),
            restock: Joi.boolean().default(false),
        }).validate(req.body);
        if (error || !mongoose.isObjectIdOrHexString(req.params.id))
            throw new ExpressError(400, "Choose an action and enter a note of 5–300 characters.");
        await service.change(req.user, req.params.id, value);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
exports.code = async (req, res, next) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id))
            throw new ExpressError(400, "Invalid replacement.");
        const result = await mongoose.connection.transaction(async (session) => {
            const record = await Replacement.findById(req.params.id).session(session).lean();
            if (!record) throw new ExpressError(404, "Replacement not found.");
            const customer =
                req.user.role === "customer" && String(record.userId) === String(req.user._id);
            const seller =
                req.user.role === "seller" &&
                (await SellerProfile.exists({
                    _id: record.sellerProfileId,
                    userId: req.user._id,
                }).session(session));
            if (!customer && !seller)
                throw new ExpressError(403, "This handover code is not available to your account.");
            const tasks = await DeliveryTask.find({
                replacementId: record._id,
                stage: { $in: ["ready_for_pickup", "assigned", "out_for_delivery"] },
            })
                .select("+otpHash +otpCiphertext")
                .session(session);
            const task = tasks.find((entry) => {
                const source = entry.stage !== "out_for_delivery";
                return (entry.kind === "replacement_pickup" ? source : !source) ? customer : seller;
            });
            if (!task) throw new ExpressError(409, "No handover is currently awaiting your code.");
            if (task.otpAttempts >= 5)
                throw new ExpressError(429, "OTP is locked. Contact administrator for recovery.");
            if (!task.otpHash || task.otpExpiresAt <= new Date()) {
                otp.issue(task, task.stage === "out_for_delivery" ? "delivery" : "pickup");
                await task.save({ session });
            }
            return {
                otp: otp.code(task),
                expiresAt: task.otpExpiresAt,
                taskType: task.kind,
                stage: task.stage,
            };
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
};
