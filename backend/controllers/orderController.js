
const Joi = require("joi");

const Order = require("../models/Order");
const SellerProfile = require("../models/SellerProfile");
const SellerOrder = require("../models/SellerOrder");
const ExpressError = require("../utils/ExpressError");
const deliveryService = require("../services/deliveryService");

const {
    readOrder,
    readManagedOrder,
    advanceParcel,
} = require("../services/orderService");

// ================== CUSTOMER ORDERS ==================
exports.list = async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);

        if (!Number.isSafeInteger(page) || page < 1) {
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
        checkIds(req);

        res.json({
            order: await readOrder(req.user._id, req.params.id),
        });
    } catch (error) {
        next(error);
    }
};

// ================== STAFF ACCESS ==================
async function sellerScope(req) {
    if (req.user.role === "admin") return null;

    const profile = await SellerProfile.findOne({
        userId: req.user._id,
        status: "Approved",
    })
        .select("_id")
        .lean();

    if (!profile) {
        throw new ExpressError(
            403,
            "Your seller account must be approved first."
        );
    }

    return profile._id;
}

function checkIds(req) {
    const ids = [
        req.params.id,
        req.params.parcelId,
    ].filter(Boolean);

    for (const id of ids) {
        if (!/^[a-f0-9]{24}$/i.test(id)) {
            throw new ExpressError(
                404,
                "Order not found."
            );
        }
    }
}

// ================== STAFF ORDERS ==================
exports.managedList = async (req, res, next) => {
    try {
        const page = Number(req.query.page || 1);

        if (!Number.isSafeInteger(page) || page < 1) {
            throw new ExpressError(400, "Invalid page.");
        }

        const sellerProfileId = await sellerScope(req);
        const model = sellerProfileId ? SellerOrder : Order;

        const filter = sellerProfileId
            ? { sellerProfileId }
            : { status: "Confirmed" };

        const rows = await model.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * 50)
            .limit(50)
            .select("_id orderId")
            .lean();

        const orders = [];

        // Keep concurrent database work bounded.
        for (
            let offset = 0;
            offset < rows.length;
            offset += 5
        ) {
            const batch = await Promise.all(
                rows.slice(offset, offset + 5).map((row) =>
                    readManagedOrder(
                        sellerProfileId
                            ? row.orderId
                            : row._id,
                        sellerProfileId,
                        sellerProfileId
                            ? row._id
                            : null
                    )
                )
            );

            for (const data of batch) {
                orders.push(
                    ...(Array.isArray(data) ? data : [data])
                );
            }
        }

        res.json({
            orders,
            hasMore:
                page * 50 < await model.countDocuments(filter),
        });
    } catch (error) {
        next(error);
    }
};

exports.managedDetail = async (req, res, next) => {
    try {
        checkIds(req);

        const sellerProfileId = await sellerScope(req);

        const data = await readManagedOrder(
            req.params.id,
            sellerProfileId,
            req.params.parcelId
        );

        res.json({
            order: sellerProfileId ? data[0] : data,
        });
    } catch (error) {
        next(error);
    }
};

// ================== SELLER FULFILMENT ==================
exports.advance = async (req, res, next) => {
    try {
        checkIds(req);

        const { value, error } = Joi.object({
            status: Joi.string()
                .valid("Packing", "Ready for Pickup")
                .required(),

            note: Joi.string()
                .trim()
                .max(200)
                .allow("")
                .default(""),
        }).validate(req.body, {
            allowUnknown: false,
        });

        if (error) {
            throw new ExpressError(
                400,
                error.details[0].message
            );
        }

        const sellerProfileId = await sellerScope(req);

        const order = await advanceParcel(
            sellerProfileId,
            req.user._id,
            req.params.id,
            req.params.parcelId,
            value.status,
            value.note
        );

        res.json({ order });
    } catch (error) {
        next(error);
    }
};

// ================== SELLER PICKUP OTP ==================
// Code is visible only to the seller owning the parcel.
async function pickupCode(req, res, next, regenerate = false) {
    try {
        checkIds(req);

        const sellerId = await sellerScope(req);

        const data = await deliveryService.sellerPickupCode(
            sellerId,
            req.params.id,
            req.params.parcelId,
            regenerate
        );

        res.json(data);
    } catch (error) {
        next(error);
    }
}

exports.pickupOtp = (req, res, next) =>
    pickupCode(req, res, next);

exports.regeneratePickupOtp = (req, res, next) =>
    pickupCode(req, res, next, true);
