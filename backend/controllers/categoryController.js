const { randomUUID } = require("node:crypto");

const Category = require("../models/Category");
const cloudinary = require("../config/cloudinary");
const ExpressError = require("../utils/ExpressError");
const { categoryListSchema } = require("../validations/schema");

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Read category form data
exports.parseBody = (req, res, next) => {
    if (!req.is("multipart/form-data")) return next();

    try {
        if (
            Object.keys(req.body).length !== 1 ||
            typeof req.body.data !== "string" ||
            (req.files || []).length > 1
        ) {
            throw new Error();
        }

        req.body = JSON.parse(req.body.data);
        next();
    } catch {
        next(
            new ExpressError(
                400,
                "Submit category details and at most one image."
            )
        );
    }
};

// Category images are managed independently of product images.
function uploadImage(file) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                public_id: `zupito/categories/${randomUUID()}`,
                resource_type: "image",
                allowed_formats: ["jpg", "jpeg", "png", "webp"],
                transformation: [
                    { width: 800, height: 800, crop: "limit" },
                ],
                timeout: 45000,
            },
            (error, result) => {
                if (error || !result?.secure_url) {
                    return reject(
                        new ExpressError(502, "Category image upload failed.")
                    );
                }

                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        stream.end(file.buffer);
    });
}

async function removeImage(image) {
    if (!image?.publicId) return;

    try {
        await cloudinary.uploader.destroy(image.publicId, {
            invalidate: true,
            timeout: 10000,
        });
    } catch {
        console.error("Category image cleanup failed.");
    }
}

// Category listing
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
                : { $ne: "Active" };
        }

        if (search) {
            const expression = new RegExp(escapeRegex(search), "i");

            filter.$or = [
                "name",
                "slug",
                "parent.name",
                "attributes",
            ].map((key) => ({ [key]: expression }));
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
                    parentName: "$parent.name",
                    version: { $ifNull: ["$__v", 0] },
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
                },
            },
            {
                $facet: {
                    categories: [
                        { $match: filter },
                        { $sort: { sortOrder: 1, name: 1, _id: 1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $unset: [
                                "parent",
                                "nameKey",
                                "image.publicId",
                                "statusHistory",
                            ],
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
                                            { $eq: ["$parentId", null] },
                                            1,
                                            0,
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

// Create or update a category
exports.saveCategory = async (req, res, next) => {
    let uploaded;
    let saved = false;

    try {
        const { version, ...data } = req.body;
        const editing = Boolean(req.params.categoryId);

        const previous = editing
            ? await Category.findById(req.params.categoryId)
                .select("+image.publicId")
            : null;

        if (editing && !previous) {
            throw new ExpressError(404, "Category not found.");
        }

        if (editing && previous.__v !== version) {
            throw new ExpressError(
                409,
                "Category changed. Refresh and edit again."
            );
        }

        if (
            editing &&
            String(previous.parentId || "") !== String(data.parentId || "")
        ) {
            throw new ExpressError(
                400,
                "Category type and parent cannot change."
            );
        }

        if (data.parentId) {
            if (
                !editing &&
                !await Category.exists({
                    _id: data.parentId,
                    parentId: null,
                    status: "Active",
                })
            ) {
                throw new ExpressError(400, "Select an active main category.");
            }

            if (data.showOnHome || req.files?.length) {
                throw new ExpressError(
                    400,
                    "Home images belong to main categories."
                );
            }

            const attributes = new Set(
                data.attributes.map((name) => name.toLowerCase())
            );

            if (
                data.filterAttributes.some(
                    (name) => !attributes.has(name.toLowerCase())
                )
            ) {
                throw new ExpressError(
                    400,
                    "Choose filter attributes from the category specifications."
                );
            }
        } else if (data.filterAttributes.length) {
            throw new ExpressError(
                400,
                "Configure attribute filters on subcategories."
            );
        }

        if (req.files?.[0]) {
            uploaded = await uploadImage(req.files[0]);
        }

        if (
            data.showOnHome &&
            !(uploaded?.url || previous?.image?.url)
        ) {
            throw new ExpressError(
                400,
                "Upload a category image before showing it on Home."
            );
        }

        const changes = {
            ...data,
            nameKey: data.name.toLowerCase(),
            updatedById: req.user._id,
        };

        if (uploaded) changes.image = uploaded;

        if (editing) {
            delete changes.parentId;

            const result = await Category.updateOne(
                {
                    _id: previous._id,
                    __v: version,
                },
                {
                    $set: changes,
                    $inc: { __v: 1 },
                },
                { runValidators: true }
            );

            if (!result.matchedCount) {
                throw new ExpressError(
                    409,
                    "Category changed. Refresh and edit again."
                );
            }
        } else {
            const slug = data.name
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/&/g, "and")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");

            if (!slug) {
                throw new ExpressError(
                    400,
                    "Use a category name with a valid URL slug."
                );
            }

            await Category.create({
                ...changes,
                slug,
                createdById: req.user._id,
                statusHistory: [
                    {
                        status: "Active",
                        changedById: req.user._id,
                    },
                ],
            });
        }

        saved = true;

        if (uploaded && previous) {
            await removeImage(previous.image);
        }

        res.status(editing ? 200 : 201).json({
            success: true,
            message: "Category saved successfully.",
        });
    } catch (error) {
        if (!saved) await removeImage(uploaded);

        next(
            error.code === 11000
                ? new ExpressError(
                    409,
                    "Category name or slug already exists."
                )
                : error
        );
    }
};

// Category status history
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