const Order = require("../models/Order");
const { readOrder } = require("../services/orderService");
const ExpressError = require("../utils/ExpressError");

exports.list = async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);

        if (!Number.isInteger(page) || page < 1) {
            throw new ExpressError(400, "Invalid page.");
        }

        const filter = {
            userId: req.user._id,
            status: "Confirmed",
        };

        const rows = await Order.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * 50)
            .limit(50)
            .select("_id")
            .lean();

        const orders = await Promise.all(
            rows.map((row) => readOrder(req.user._id, row._id))
        );

        res.json({
            orders,
            hasMore: page * 50 < await Order.countDocuments(filter),
        });
    } catch (error) {
        next(error);
    }
};

exports.detail = async (req, res, next) => {
    try {
        if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
            throw new ExpressError(404, "Order not found.");
        }

        res.json({
            order: await readOrder(req.user._id, req.params.id),
        });
    } catch (error) {
        next(error);
    }
};