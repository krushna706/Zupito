const User = require("../models/User");
const SellerProfile = require("../models/SellerProfile");
const ExpressError = require("../utils/ExpressError");
const { adminSellerListSchema } = require("../validations/schema");

const transitions = {
    Approve: { from: "Pending", to: "Approved" },
    Reject: { from: "Pending", to: "Rejected" },
    Suspend: { from: "Approved", to: "Suspended" },
    Reactivate: { from: "Suspended", to: "Approved" },
};

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Search and paginate registered seller applications.
exports.getSellers = async (req, res, next) => {
    try {
        const { value, error } = adminSellerListSchema.validate(req.query);

        if (error) {
            throw new ExpressError(400, error.details[0].message);
        }

        const { search, status, page, limit } = value;
        const filter = {};

        if (status !== "All") {
            filter.status = status;
        }

        if (search) {
            const pattern = new RegExp(escapeRegex(search), "i");

            filter.$or = [
                { storeName: pattern },
                { storeEmail: pattern },
                { storePhone: pattern },
                { "account.name": pattern },
                { "account.email": pattern },
                { "account.phone": pattern },
                { "pickupAddress.city": pattern },
            ];
        }

        const [result] = await SellerProfile.aggregate([
            {
                $lookup: {
                    from: User.collection.name,
                    localField: "userId",
                    foreignField: "_id",
                    as: "account",
                },
            },
            { $unwind: "$account" },
            { $match: { "account.role": "seller" } },
            {
                $facet: {
                    sellers: [
                        { $match: filter },
                        { $sort: { createdAt: -1, _id: -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $project: {
                                userId: 1,
                                name: "$account.name",
                                email: "$account.email",
                                phone: "$account.phone",
                                accountStatus: "$account.status",
                                storeName: 1,
                                storeEmail: 1,
                                storePhone: 1,
                                description: 1,
                                pickupAddress: 1,
                                status: 1,
                                remarks: 1,
                                reviewedAt: 1,
                                reviewedById: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                version: "$__v",
                            },
                        },
                    ],
                    count: [
                        { $match: filter },
                        { $count: "total" },
                    ],
                    statistics: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                pending: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$status", "Pending"] }, 1, 0,
                                        ],
                                    },
                                },
                                approved: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$status", "Approved"] }, 1, 0,
                                        ],
                                    },
                                },
                                suspended: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$status", "Suspended"] }, 1, 0,
                                        ],
                                    },
                                },
                            },
                        },
                    ],
                },
            },
        ]);

        const stats = result.statistics[0] || {
            total: 0,
            pending: 0,
            approved: 0,
            suspended: 0,
        };

        res.json({
            success: true,
            sellers: result.sellers,
            total: result.count[0]?.total || 0,
            statistics: {
                total: stats.total,
                pending: stats.pending,
                approved: stats.approved,
                suspended: stats.suspended,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Apply one allowed decision and retain its history.
exports.updateSellerStatus = async (req, res, next) => {
    try {
        const { action, reason, version } = req.body;
        const transition = transitions[action];

        const seller = await SellerProfile.findById(req.params.sellerId)
            .select("userId status");

        if (!seller) {
            throw new ExpressError(404, "Seller application not found.");
        }

        const account = await User.findOne({
            _id: seller.userId,
            role: "seller",
        }).select("status");

        if (!account) {
            throw new ExpressError(404, "Seller account not found.");
        }

        if (transition.to === "Approved" && account.status !== "Active") {
            throw new ExpressError(
                409,
                "Activate the user account before approving selling access."
            );
        }

        const now = new Date();

        const updated = await SellerProfile.findOneAndUpdate(
            {
                _id: seller._id,
                status: transition.from,
                __v: version,
            },
            {
                $set: {
                    status: transition.to,
                    remarks: reason,
                    reviewedById: req.user._id,
                    reviewedAt: now,
                },
                $inc: { __v: 1 },
                $push: {
                    statusHistory: {
                        fromStatus: transition.from,
                        toStatus: transition.to,
                        reason,
                        changedById: req.user._id,
                        changedAt: now,
                    },
                },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!updated) {
            throw new ExpressError(
                409,
                "Seller application changed. Refresh and review it again."
            );
        }

        res.json({
            success: true,
            message: action === "Reactivate"
                ? "Seller reactivated successfully."
                : `Seller ${transition.to.toLowerCase()} successfully.`,
        });
    } catch (error) {
        next(error);
    }
};