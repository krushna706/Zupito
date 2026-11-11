const User = require("../models/User");
const SellerProfile = require("../models/SellerProfile");
const ExpressError = require("../utils/ExpressError");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { adminSellerListSchema } = require("../validations/schema");
const { adminProductListSchema } = require("../validations/schema");

const transitions = {
    Approve: { from: "Pending", to: "Approved" },
    Reject: { from: "Pending", to: "Rejected" },
    Suspend: { from: "Approved", to: "Suspended" },
    Reactivate: { from: "Suspended", to: "Approved" },
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
                    count: [{ $match: filter }, { $count: "total" }],
                    statistics: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                pending: {
                                    $sum: {
                                        $cond: [{ $eq: ["$status", "Pending"] }, 1, 0],
                                    },
                                },
                                approved: {
                                    $sum: {
                                        $cond: [{ $eq: ["$status", "Approved"] }, 1, 0],
                                    },
                                },
                                suspended: {
                                    $sum: {
                                        $cond: [{ $eq: ["$status", "Suspended"] }, 1, 0],
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

        const seller = await SellerProfile.findById(req.params.sellerId).select("userId status");

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
            throw new ExpressError(409, "Seller application changed. Refresh and review it again.");
        }

        res.json({
            success: true,
            message:
                action === "Reactivate"
                    ? "Seller reactivated successfully."
                    : `Seller ${transition.to.toLowerCase()} successfully.`,
        });
    } catch (error) {
        next(error);
    }
};

// Product review helpers
const productDecisions = {
    Approve: { from: "Pending", to: "Approved" },
    Reject: { from: "Pending", to: "Rejected" },
    Suspend: { from: "Approved", to: "Suspended" },
    Reactivate: { from: "Suspended", to: "Approved" },
};

function populateProductReview(query) {
    return query
        .populate({
            path: "sellerProfileId",
            select: "storeName status userId",
            populate: {
                path: "userId",
                select: "name role status",
            },
        })
        .populate({
            path: "categoryId",
            select: "name status parentId",
            populate: {
                path: "parentId",
                select: "name status",
            },
        });
}

function productReviewResponse(product, includeDetails = false) {
    const seller = product.sellerProfileId;
    const account = seller?.userId;
    const category = product.categoryId;
    const parent = category?.parentId;
    const variants = product.variants || [];

    let approvalIssue = "";

    if (!seller || seller.status !== "Approved") {
        approvalIssue = "Seller profile is not approved.";
    } else if (!account || account.role !== "seller" || account.status !== "Active") {
        approvalIssue = "Seller account is unavailable or inactive.";
    } else if (!category || category.status !== "Active") {
        approvalIssue = "Product category is unavailable or disabled.";
    } else if (!parent || parent.status !== "Active") {
        approvalIssue = "Parent category is unavailable or disabled.";
    }

    const result = {
        id: String(product._id),
        version: product.__v ?? 0,
        productCode: product.productCode,
        name: product.name,
        brand: product.brand,
        image: product.images?.[0]?.url || "",

        sellerName: seller?.storeName || "Unavailable seller",
        sellerProfileId: seller ? String(seller._id) : null,
        sellerUserId: account ? String(account._id) : null,
        sellerStatus: seller?.status || "Unavailable",
        sellerAccountStatus: account?.status || "Unavailable",

        categoryName: category?.name || "Unavailable category",
        parentCategoryName: parent?.name || "Unavailable category",

        pricePaise: variants.length
            ? Math.min(...variants.map((variant) => variant.pricePaise))
            : 0,

        stock: variants.reduce((total, variant) => total + variant.stock, 0),

        reservedQuantity: variants.reduce(
            (total, variant) => total + (variant.reservedQuantity || 0),
            0
        ),

        variantCount: variants.length,
        status: product.status,
        reviewType: product.reviewType,
        moderationReason: product.moderationReason,
        submittedAt: product.submittedAt,
        reviewedAt: product.reviewedAt,
        approvalIssue,
    };

    if (!includeDetails) return result;

    return {
        ...result,

        description: product.description,
        highlights: product.highlights || [],
        specifications: product.specifications || [],

        images: (product.images || []).map((image) => ({
            url: image.url,
        })),

        variants: variants.map((variant) => ({
            variantId: variant.variantId,
            sku: variant.sku,
            label: variant.label,
            pricePaise: variant.pricePaise,
            mrpPaise: variant.mrpPaise,
            stock: variant.stock,
            reservedQuantity: variant.reservedQuantity || 0,
            imageIndex: variant.imageIndex,
        })),

        reviewedById: product.reviewedById,

        moderationHistory: (product.moderationHistory || []).slice(-20).reverse(),
    };
}

// Product listing
exports.getAdminProducts = async (req, res, next) => {
    try {
        const { value, error } = adminProductListSchema.validate(req.query, {
            abortEarly: true,
            allowUnknown: false,
        });

        if (error) {
            throw new ExpressError(400, error.details[0].message);
        }

        const { search, status, categoryId, page, limit } = value;
        const filter = {};

        if (status !== "All") filter.status = status;

        if (categoryId) {
            const children = await Category.distinct("_id", {
                parentId: categoryId,
            });

            filter.categoryId = { $in: [categoryId, ...children] };
        }

        if (search) {
            const expression = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

            const [sellerIds, matchingCategories] = await Promise.all([
                SellerProfile.distinct("_id", { storeName: expression }),
                Category.distinct("_id", { name: expression }),
            ]);

            const childCategories = await Category.distinct("_id", {
                parentId: { $in: matchingCategories },
            });

            filter.$or = [
                { name: expression },
                { brand: expression },
                { productCode: expression },
                { sellerProfileId: { $in: sellerIds } },
                {
                    categoryId: {
                        $in: [...matchingCategories, ...childCategories],
                    },
                },
            ];

            if (mongoose.isObjectIdOrHexString(search)) {
                filter.$or.push({ _id: search });
            }
        }

        const [products, total, counts, categories] = await Promise.all([
            populateProductReview(
                Product.find(filter)
                    .sort({ submittedAt: -1, _id: -1 })
                    .skip((page - 1) * limit)
                    .limit(limit)
            ).lean(),

            Product.countDocuments(filter),

            Product.aggregate([
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]),

            Category.find({ parentId: null })
                .select("name status")
                .sort({ sortOrder: 1, name: 1 })
                .lean(),
        ]);

        const statusCounts = Object.fromEntries(counts.map((item) => [item._id, item.count]));

        return res.json({
            success: true,
            products: products.map((product) => productReviewResponse(product)),
            total,
            page,
            limit,
            categories,
            statistics: {
                total: counts.reduce((sum, item) => sum + item.count, 0),
                pending: statusCounts.Pending || 0,
                approved: statusCounts.Approved || 0,
                restricted: (statusCounts.Rejected || 0) + (statusCounts.Suspended || 0),
            },
        });
    } catch (error) {
        return next(error);
    }
};

// Product review details
exports.getAdminProduct = async (req, res, next) => {
    try {
        const product = await populateProductReview(
            Product.findById(req.params.productId).select("+moderationHistory")
        ).lean();

        if (!product) {
            throw new ExpressError(404, "Product not found.");
        }

        return res.json({
            success: true,
            product: productReviewResponse(product, true),
        });
    } catch (error) {
        return next(error);
    }
};

// Apply one decision atomically
async function applyProductDecision(productId, values, adminUserId) {
    const { action, reason, version } = values;
    const decision = productDecisions[action];
    const session = await mongoose.startSession();

    try {
        let updatedProduct;

        await session.withTransaction(async () => {
            const product = await Product.findById(productId).session(session).lean();

            if (!product) {
                throw new ExpressError(404, "Product not found.");
            }

            if ((product.__v ?? 0) !== version || product.status !== decision.from) {
                throw new ExpressError(
                    409,
                    "Product changed after it was loaded. Refresh and review it again."
                );
            }

            if (decision.to === "Approved") {
                if (!product.images?.length)
                    throw new ExpressError(
                        409,
                        "Seller must upload product images before approval."
                    );

                const seller = await SellerProfile.findOneAndUpdate(
                    {
                        _id: product.sellerProfileId,
                        status: "Approved",
                    },
                    { $inc: { __v: 1 } },
                    { session, returnDocument: "after" }
                );

                if (!seller) {
                    throw new ExpressError(409, "Seller profile is not approved.");
                }

                const account = await User.findOneAndUpdate(
                    {
                        _id: seller.userId,
                        role: "seller",
                        status: "Active",
                    },
                    { $inc: { __v: 1 } },
                    { session, returnDocument: "after" }
                ).select("_id");

                if (!account) {
                    throw new ExpressError(409, "Seller account is inactive or unavailable.");
                }

                const category = await Category.findOneAndUpdate(
                    {
                        _id: product.categoryId,
                        parentId: { $ne: null },
                        status: "Active",
                    },
                    { $inc: { __v: 1 } },
                    { session, returnDocument: "after" }
                );

                if (!category) {
                    throw new ExpressError(409, "Product category is disabled or unavailable.");
                }

                const parent = await Category.findOneAndUpdate(
                    {
                        _id: category.parentId,
                        parentId: null,
                        status: "Active",
                    },
                    { $inc: { __v: 1 } },
                    { session, returnDocument: "after" }
                );

                if (!parent) {
                    throw new ExpressError(409, "Parent category is disabled or unavailable.");
                }

                const specificationNames = new Set(
                    (product.specifications || []).map((item) => item.label.trim().toLowerCase())
                );

                const missingAttribute = (category.attributes || []).find(
                    (attribute) => !specificationNames.has(attribute.trim().toLowerCase())
                );

                if (missingAttribute) {
                    throw new ExpressError(
                        409,
                        `Seller must add the required specification: ${missingAttribute}.`
                    );
                }

                if (!product.images?.length || !product.variants?.length) {
                    throw new ExpressError(
                        409,
                        "Product must have an image and at least one variant."
                    );
                }
            }

            const changedAt = new Date();

            updatedProduct = await Product.findOneAndUpdate(
                {
                    _id: productId,
                    status: decision.from,
                    __v: version,
                },
                {
                    $set: {
                        status: decision.to,
                        moderationReason: ["Reject", "Suspend"].includes(action) ? reason : "",
                        reviewedAt: changedAt,
                        reviewedById: adminUserId,
                    },

                    $inc: { __v: 1 },

                    $push: {
                        moderationHistory: {
                            action,
                            fromStatus: decision.from,
                            toStatus: decision.to,
                            reason,
                            reviewedVersion: version,
                            changedById: adminUserId,
                            changedAt,
                        },
                    },
                },
                {
                    session,
                    returnDocument: "after",
                    runValidators: true,
                }
            ).select("_id status __v");

            if (!updatedProduct) {
                throw new ExpressError(409, "Product changed. Refresh and review it again.");
            }
        });

        return {
            id: String(updatedProduct._id),
            status: updatedProduct.status,
            version: updatedProduct.__v,
        };
    } finally {
        await session.endSession();
    }
}

// Single product decision
exports.updateProductStatus = async (req, res, next) => {
    try {
        const product = await applyProductDecision(req.params.productId, req.body, req.user._id);

        return res.json({
            success: true,
            message: `Product status updated to ${product.status}.`,
            product,
        });
    } catch (error) {
        return next(error);
    }
};

// Bulk review returns a result for every product
exports.bulkProductStatus = async (req, res, next) => {
    try {
        const { action, reason, items } = req.body;
        const results = [];

        for (const item of items) {
            try {
                const product = await applyProductDecision(
                    item.productId,
                    {
                        action,
                        reason,
                        version: item.version,
                    },
                    req.user._id
                );

                results.push({
                    productId: item.productId,
                    success: true,
                    message: `Product ${product.status.toLowerCase()}.`,
                });
            } catch (error) {
                const expected = error.statusCode >= 400 && error.statusCode < 500;

                if (!expected) {
                    console.error("Product moderation failed:", error.message);
                }

                results.push({
                    productId: item.productId,
                    success: false,
                    message: expected
                        ? error.message
                        : "Decision could not be completed. Refresh before retrying.",
                });
            }
        }

        return res.json({
            success: true,
            results,
        });
    } catch (error) {
        return next(error);
    }
};
// Customer accounts retain their historical orders when access is restricted.
exports.customers = async (req, res, next) => {
    try {
        const users = await require("../models/User")
            .find({ role: "customer" })
            .select("name email phone status createdAt updatedAt")
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();
        res.json({
            customers: users.map((u) => ({
                ...u,
                id: String(u._id),
                joinedAt: u.createdAt,
                status: u.status === "Active" ? "Active" : "Restricted",
            })),
        });
    } catch (error) {
        next(error);
    }
};
exports.customerStatus = async (req, res, next) => {
    try {
        const { value, error } = require("joi")
            .object({
                status: require("joi").string().valid("Active", "Restricted").required(),
                reason: require("joi").string().trim().min(5).max(300).required(),
            })
            .validate(req.body);
        if (error) throw new ExpressError(400, error.details[0].message);
        if (!mongoose.isObjectIdOrHexString(req.params.customerId))
            throw new ExpressError(400, "Invalid customer.");
        await mongoose.connection.transaction(async (session) => {
            const user = await require("../models/User").findOneAndUpdate(
                { _id: req.params.customerId, role: "customer" },
                {
                    $set: { status: value.status === "Active" ? "Active" : "Inactive" },
                    $inc: { tokenVersion: 1 },
                },
                { session, returnDocument: "after" }
            );
            if (!user) throw new ExpressError(404, "Customer not found.");
            await require("../models/AuthSession").updateMany(
                { userId: user._id, revokedAt: null },
                {
                    $set: { revokedAt: new Date(), revokeReason: "admin_action" },
                },
                { session }
            );
            await require("../services/auditService").record(
                req.user._id,
                "customer.status",
                user._id,
                value.reason,
                session
            );
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
