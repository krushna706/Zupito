const Joi = require("joi");
const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const Order = require("../models/Order");
const ExpressError = require("../utils/ExpressError");
const dto = (row) => ({
    ...row,
    id: String(row._id),
    orderId: row.orderId ? String(row.orderId) : null,
});

exports.create = async (req, res, next) => {
    let upload;
    try {
        const publicRequest = !req.user;
        const { value, error } = require("../validations/schema").complaintSchema.validate(
            req.body
        );
        if (error) throw new ExpressError(400, error.details[0].message);
        if (publicRequest && (!value.name || !value.email))
            throw new ExpressError(400, "Name and email are required.");
        if (publicRequest && value.orderId)
            throw new ExpressError(401, "Sign in to submit an order-related complaint.");
        if (value.orderId && !(await Order.exists({ _id: value.orderId, userId: req.user._id }))) {
            throw new ExpressError(404, "Order not found in your account.");
        }
        if (req.file) {
            upload = await new Promise((resolve, reject) => {
                const stream = require("../config/cloudinary").uploader.upload_stream(
                    {
                        folder: "zupito/support",
                        resource_type: "image",
                    },
                    (error, result) => (error ? reject(error) : resolve(result))
                );
                stream.end(req.file.buffer);
            });
        }
        const row = await mongoose.connection.transaction(async (session) => {
            if (value.orderId)
                await Order.updateOne({ _id: value.orderId }, { $inc: { __v: 1 } }, { session });
            const [record] = await Complaint.create(
                [
                    {
                        userId: req.user?._id || null,
                        orderId: value.orderId || null,
                        customer: req.user?.name || value.name,
                        email: req.user?.email || value.email,
                        phone: req.user?.phone || value.phone,
                        category: value.category || "other",
                        subject: value.subject,
                        description: value.description || value.message,
                        attachment: upload?.secure_url,
                    },
                ],
                { session }
            );
            return record;
        });
        res.status(201).json({ complaint: dto(row.toObject()) });
    } catch (error) {
        if (upload)
            await require("../config/cloudinary")
                .uploader.destroy(upload.public_id)
                .catch(() => {});
        next(error);
    }
};
exports.list = async (req, res, next) => {
    try {
        const filter = req.user.role === "admin" ? {} : { userId: req.user._id };
        const rows = await Complaint.find(filter).sort({ createdAt: -1 }).limit(500).lean();
        res.json({
            complaints: rows.map((row) => {
                const result = dto(row);
                if (req.user.role !== "admin") delete result.history;
                return result;
            }),
        });
    } catch (error) {
        next(error);
    }
};
exports.update = async (req, res, next) => {
    try {
        const { value, error } = Joi.object({
            status: Joi.string().valid("Open", "In Progress", "Resolved", "Closed"),
            message: Joi.string().trim().min(10).max(1500),
            note: Joi.string().trim().max(300).allow("").default(""),
        })
            .or("status", "message")
            .validate(req.body);
        if (error || !mongoose.isObjectIdOrHexString(req.params.id))
            throw new ExpressError(400, "Check complaint update.");
        await mongoose.connection.transaction(async (session) => {
            const row = await Complaint.findById(req.params.id).session(session);
            if (!row) throw new ExpressError(404, "Complaint not found.");
            if (value.message) {
                row.replies.push({ author: "Zupito Support", message: value.message });
                row.status = "In Progress";
            }
            if (value.status) {
                if (["Resolved", "Closed"].includes(value.status) && !row.replies.length)
                    throw new ExpressError(409, "Reply before resolving this complaint.");
                row.status = value.status;
            }
            row.history.push({
                action: row.status,
                note: value.note || "Support response recorded.",
                actorUserId: req.user._id,
            });
            await row.save({ session });
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
