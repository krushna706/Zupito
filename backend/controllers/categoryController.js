const Category = require("../models/Category");
const ExpressError = require("../utils/ExpressError");
const { categoryListSchema } = require("../validations/schema");

const createSlug = (name) =>
    name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function handleError(error, next) {
    if (error.code === 11000) {
        return next(
            new ExpressError(
                409,
                "This category name or slug already exists. Choose another name."
            )
        );
    }

    next(error);
}

// List categories with filters, counts and parent options.
exports.getCategories = async (req, res, next) => {
    try {
        const { value, error } = categoryListSchema.validate(req.query);

        if (error) {
            throw new ExpressError(400, error.details[0].message);
        }

        const { search, type, status, page, limit } = value;
        const filter = {};

        if (type === "Main") filter.parentId = null;
        if (type === "Subcategory") filter.parentId = { $ne: null };

        if (status !== "All") {
            filter.effectiveStatus = status === "Active"
                ? "Active"
                : { $in: ["Disabled", "Parent Disabled"] };
        }

        if (search) {
            const pattern = new RegExp(escapeRegex(search), "i");

            filter.$or = [
                { name: pattern },
                { slug: pattern },
                { "parent.name": pattern },
                { attributes: pattern },
            ];
        }

        const [result] = await Category.aggregate([
            {
                $lookup: {
                    from: Category.collection.name,
                    localField: "parentId",
                    foreignField: "_id",
                    as: "parent",
                },
            },
            {
                $set: {
                    parent: { $arrayElemAt: ["$parent", 0] },
                },
            },
            {
                $set: {
                    effectiveStatus: {
                        $cond: [
                            { $eq: ["$status", "Disabled"] },
                            "Disabled",
                            {
                                $cond: [
                                    { $eq: ["$parent.status", "Disabled"] },
                                    "Parent Disabled",
                                    "Active",
                                ],
                            },
                        ],
                    },
                    groupName: { $ifNull: ["$parent.name", "$name"] },
                },
            },
            {
                $facet: {
                    categories: [
                        { $match: filter },
                        {
                            $sort: {
                                groupName: 1,
                                parentId: 1,
                                sortOrder: 1,
                                name: 1,
                                _id: 1,
                            },
                        },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $project: {
                                name: 1,
                                slug: 1,
                                parentId: 1,
                                parentName: "$parent.name",
                                description: 1,
                                sortOrder: 1,
                                attributes: 1,
                                replacementAllowed: 1,
                                replacementDays: 1,
                                status: 1,
                                effectiveStatus: 1,
                                remarks: 1,
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
                    parents: [
                        { $match: { parentId: null } },
                        { $sort: { sortOrder: 1, name: 1 } },
                        { $project: { name: 1, status: 1 } },
                    ],
                    statistics: [
                        {
                            $group: {
                                _id: null,
                                total: { $sum: 1 },
                                main: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$parentId", null] }, 1, 0,
                                        ],
                                    },
                                },
                                disabled: {
                                    $sum: {
                                        $cond: [
                                            { $ne: ["$effectiveStatus", "Active"] },
                                            1,
                                            0,
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
            main: 0,
            disabled: 0,
        };

        res.json({
            success: true,
            categories: result.categories,
            parents: result.parents,
            total: result.count[0]?.total || 0,
            statistics: {
                total: stats.total,
                main: stats.main,
                subcategories: stats.total - stats.main,
                disabled: stats.disabled,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Create a main category or one-level subcategory.
exports.createCategory = async (req, res, next) => {
    try {
        const data = req.body;
        const slug = createSlug(data.name);

        if (!slug) {
            throw new ExpressError(
                400,
                "Use a category name that can generate a valid URL slug."
            );
        }

        if (data.parentId) {
            const parent = await Category.exists({
                _id: data.parentId,
                parentId: null,
                status: "Active",
            });

            if (!parent) {
                throw new ExpressError(
                    400,
                    "Select an active main category."
                );
            }
        }

        await Category.create({
            ...data,
            slug,
            nameKey: data.name.toLowerCase(),
            createdById: req.user._id,
            updatedById: req.user._id,
            statusHistory: [{
                status: "Active",
                changedById: req.user._id,
            }],
        });

        res.status(201).json({
            success: true,
            message: "Category added successfully.",
        });
    } catch (error) {
        handleError(error, next);
    }
};

// Keep category references stable while editing details.
exports.updateCategory = async (req, res, next) => {
    try {
        const { version, parentId, ...data } = req.body;
        const category = await Category.findById(req.params.categoryId);

        if (!category) {
            throw new ExpressError(404, "Category not found.");
        }

        if (String(category.parentId || "") !== String(parentId || "")) {
            throw new ExpressError(
                400,
                "Category type and parent cannot be changed after creation."
            );
        }

        const updated = await Category.findOneAndUpdate(
            {
                _id: category._id,
                __v: version,
            },
            {
                $set: {
                    ...data,
                    nameKey: data.name.toLowerCase(),
                    updatedById: req.user._id,
                },
                $inc: { __v: 1 },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!updated) {
            throw new ExpressError(
                409,
                "Category changed. Refresh and open it again."
            );
        }

        res.json({
            success: true,
            message: "Category updated successfully.",
        });
    } catch (error) {
        handleError(error, next);
    }
};

// Preserve records and record every status change.
exports.updateCategoryStatus = async (req, res, next) => {
    try {
        const { status, reason, version } = req.body;

        const category = await Category.findOneAndUpdate(
            {
                _id: req.params.categoryId,
                __v: version,
                status: { $ne: status },
            },
            {
                $set: {
                    status,
                    remarks: status === "Disabled" ? reason : "",
                    updatedById: req.user._id,
                },
                $inc: { __v: 1 },
                $push: {
                    statusHistory: {
                        status,
                        reason: status === "Disabled" ? reason : "",
                        changedById: req.user._id,
                        changedAt: new Date(),
                    },
                },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!category) {
            throw new ExpressError(
                409,
                "Category is unavailable or changed. Refresh and try again."
            );
        }

        res.json({
            success: true,
            message: status === "Active"
                ? "Category enabled successfully."
                : "Category disabled successfully.",
        });
    } catch (error) {
        next(error);
    }
};