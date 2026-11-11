const Joi = require("joi");
const mongoose = require("mongoose");
const SellerProfile = require("../models/SellerProfile");
const Settlement = require("../models/Settlement");
const SellerOrder = require("../models/SellerOrder");
const Order = require("../models/Order");
const ExpressError = require("../utils/ExpressError");
const service = require("../services/settlementService");
exports.list = async (req, res, next) => {
    try {
        const filter = {};
        if (req.user.role === "seller") {
            const seller = await SellerProfile.findOne({ userId: req.user._id }).lean();
            if (!seller) throw new ExpressError(403, "Seller profile required.");
            filter.sellerProfileId = seller._id;
        }
        const [rows, parcels] = await Promise.all([
            Settlement.find(filter)
                .sort({ createdAt: -1 })
                .limit(1000)
                .populate("sellerProfileId", "storeName")
                .lean(),
            SellerOrder.find(filter).sort({ createdAt: -1 }).limit(1000).lean(),
        ]);
        const orders = await Order.find({ _id: { $in: parcels.map((row) => row.orderId) } }).lean();
        const allParcels = await SellerOrder.find({
            orderId: { $in: orders.map((row) => row._id) },
        }).lean();
        const earnings = parcels.map((parcel) => {
            const order = orders.find((row) => String(row._id) === String(parcel.orderId));
            const share = require("../services/refundService")
                .allocation(
                    order,
                    allParcels.filter((row) => String(row.orderId) === String(order._id))
                )
                .get(String(parcel._id));
            const cancelled = parcel.status === "Cancelled";
            const net = cancelled ? 0 : share.gross - share.couponShare;
            const commission = Math.round((net * (parcel.commissionBps ?? 1000)) / 10000);
            return {
                id: String(parcel._id),
                orderId: String(parcel.orderId),
                status: parcel.status,
                createdAt: parcel.createdAt,
                gross: share.gross / 100,
                discount: share.couponShare / 100,
                adjustment: cancelled ? (share.gross - share.couponShare) / 100 : 0,
                commission: commission / 100,
                payable: (net - commission) / 100,
            };
        });
        res.json({
            settlements: rows.map((row) => ({
                ...row,
                id: String(row._id),
                seller: row.sellerProfileId?.storeName || "Seller",
            })),
            earnings,
        });
    } catch (error) {
        next(error);
    }
};
exports.confirm = async (req, res, next) => {
    try {
        const { value, error } = Joi.object({
            amount: Joi.number().min(0).precision(2).required(),
            reference: Joi.string().trim().min(5).max(100).required(),
            paidAt: Joi.date().iso().max("now").required(),
        }).validate(req.body);
        if (error || !mongoose.isObjectIdOrHexString(req.params.id))
            throw new ExpressError(400, "Check amount, payment reference and date.");
        await service.confirm(req.params.id, req.user._id, value);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
