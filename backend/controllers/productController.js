const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");

const Product = require("../models/Product");
const Category = require("../models/Category");
const SellerProfile = require("../models/SellerProfile");
const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const cloudinary = require("../config/cloudinary");
const ExpressError = require("../utils/ExpressError");
const inventory = require("../services/inventoryService");
const { sellerProductListSchema } = require("../validations/schema");

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function findSeller(userId, session = null) {
    const seller = await SellerProfile.findOne({
        userId,
        status: "Approved",
    }).session(session);

    if (!seller) {
        throw new ExpressError(403, "Approved seller access is required.");
    }

    return seller;
}

function contentSignature(product) {
    return JSON.stringify({
        name: product.name,
        brand: product.brand,
        categoryId: String(product.categoryId),
        description: product.description,
        highlights: product.highlights,
        specifications: product.specifications,
        images: product.images.map((image) => image.publicId),
        variants: product.variants.map((variant) => ({
            variantId: variant.variantId,
            sku: variant.sku,
            label: variant.label,
            imageIndex: variant.imageIndex,
        })),
    });
}

function uploadImage(file, folder) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                asset_folder: folder,
                public_id: `${folder}/${randomUUID()}`,
                resource_type: "image",
                allowed_formats: ["jpg", "jpeg", "png", "webp"],
                overwrite: false,
                timeout: 45000,
                transformation: [
                    { width: 1600, height: 1600, crop: "limit" },
                ],
            },
            (error, result) => {
                if (error || !result?.secure_url) {
                    return reject(
                        new ExpressError(502, "Product image upload failed. Please try again.")
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

async function cleanupImages(images) {
    for (const image of images) {
        try {
            const used = await Product.exists({
                "images.publicId": image.publicId,
            });

            if (!used) {
                await cloudinary.uploader.destroy(image.publicId, {
                    resource_type: "image",
                    invalidate: true,
                    timeout: 10000,
                });
            }
        } catch {
            console.error("Product image cleanup failed.");
        }
    }
}

exports.parseProductBody = (req, res, next) => {
    try {
        if (
            Object.keys(req.body || {}).length !== 1 ||
            typeof req.body.data !== "string"
        ) {
            throw new Error();
        }

        req.body = JSON.parse(req.body.data);
        next();
    } catch {
        next(new ExpressError(400, "Invalid product form data."));
    }
};

exports.getProductCategories = async (req, res, next) => {
    try {
        const categories = await Category.find()
            .select("_id name parentId attributes status")
            .sort({ sortOrder: 1, name: 1 })
            .lean();

        const parents = new Map(
            categories.filter((item) => !item.parentId)
                .map((item) => [String(item._id), item])
        );

        res.json({
            success: true,
            categories: categories.map((item) => ({
                ...item,
                available: item.status === "Active" &&
                    (
                        !item.parentId ||
                        parents.get(String(item.parentId))?.status === "Active"
                    ),
            })),
        });
    } catch (error) {
        next(error);
    }
};

exports.getSellerProducts = async (req, res, next) => {
    try {
        const { value, error } = sellerProductListSchema.validate(req.query);
        if (error) throw new ExpressError(400, error.details[0].message);

        const seller = await findSeller(req.user._id);
        const { search, status, page, limit } = value;
        const filter = {};

        if (status !== "All") filter.status = status;

        if (search) {
            const pattern = new RegExp(escapeRegex(search), "i");
            filter.$or = [
                { name: pattern },
                { brand: pattern },
                { productCode: pattern },
                { "variants.sku": pattern },
            ];
        }

        const [result] = await Product.aggregate([
            { $match: { sellerProfileId: seller._id } },
            {
                $facet: {
                    products: [
                        { $match: filter },
                        { $sort: { createdAt: -1, _id: -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $project: {
                                name: 1,
                                brand: 1,
                                productCode: 1,
                                status: 1,
                                moderationReason: 1,
                                image: { $arrayElemAt: ["$images.url", 0] },
                                pricePaise: { $min: "$variants.pricePaise" },
                                stock: { $sum: "$variants.stock" },
                                reserved: { $sum: "$variants.reservedQuantity" },
                                variantCount: { $size: "$variants" },
                            },
                        },
                    ],
                    count: [{ $match: filter }, { $count: "total" }],
                    statistics: [
                        { $group: { _id: "$status", count: { $sum: 1 } } },
                    ],
                },
            },
        ]);

        const counts = Object.fromEntries(
            result.statistics.map((item) => [item._id, item.count])
        );

        res.json({
            success: true,
            products: result.products,
            total: result.count[0]?.total || 0,
            statistics: {
                total: result.statistics.reduce((sum, item) => sum + item.count, 0),
                pending: counts.Pending || 0,
                approved: counts.Approved || 0,
                restricted: (counts.Rejected || 0) + (counts.Suspended || 0),
            },
        });
    } catch (error) {
        next(error);
    }
};

exports.getSellerProduct = async (req, res, next) => {
    try {
        const seller = await findSeller(req.user._id);

        const product = await Product.findOne({
            _id: req.params.productId,
            sellerProfileId: seller._id,
        }).lean();

        if (!product) throw new ExpressError(404, "Product not found.");

        res.json({ success: true, product });
    } catch (error) {
        next(error);
    }
};

async function saveProduct(req, res, next) {
    const uploaded = [];
    let saved = false;
    let previousImages = [];

    try {
        const seller = await findSeller(req.user._id);
        const editing = Boolean(req.params.productId);
        const productId = editing
            ? new mongoose.Types.ObjectId(req.params.productId)
            : new mongoose.Types.ObjectId();

        const previous = editing
            ? await Product.findOne({
                _id: productId,
                sellerProfileId: seller._id,
            }).lean()
            : null;

        if (editing && !previous) {
            throw new ExpressError(404, "Product not found.");
        }

        if (editing && previous.__v !== req.body.version) {
            throw new ExpressError(409, "Product changed. Reload and edit again.");
        }

        const { imageKeys, stockReason, stockNote, version, ...details } = req.body;
        const files = req.files || [];
        const oldImages = new Map(
            (previous?.images || []).map((image) => [image.publicId, image])
        );

        const expectedUploads = files.map((_, index) => `upload:${index}`);

        if (
            expectedUploads.some((key) => !imageKeys.includes(key)) ||
            imageKeys.some((key) =>
                !oldImages.has(key) && !expectedUploads.includes(key)
            )
        ) {
            throw new ExpressError(400, "Invalid product image selection.");
        }

        const folder = `zupito/products/${seller._id}/${productId}`;

        for (const file of files) {
            uploaded.push(await uploadImage(file, folder));
        }

        const images = imageKeys.map((key) =>
            oldImages.get(key) || uploaded[Number(key.slice(7))]
        );

        const contentChanged = !previous ||
            contentSignature(previous) !== contentSignature({ ...details, images });

        const [activeAccount, activeSession] = await Promise.all([
            User.exists({
                _id: req.user._id,
                role: "seller",
                status: "Active",
                tokenVersion: req.user.tokenVersion,
            }),
            AuthSession.exists({
                _id: req.sessionId,
                userId: req.user._id,
                revokedAt: null,
                expiresAt: { $gt: new Date() },
            }),
        ]);

        if (!activeAccount || !activeSession) {
            throw new ExpressError(401, "Please sign in again.");
        }

        await mongoose.connection.transaction(async (session) => {
            // Serialize listing changes against seller moderation.
            const activeSeller = await SellerProfile.findOneAndUpdate(
                { _id: seller._id, status: "Approved" },
                { $inc: { __v: 1 } },
                { session }
            );

            if (!activeSeller) {
                throw new ExpressError(403, "Approved seller access is required.");
            }

            if (contentChanged) {
                const category = await Category.findOneAndUpdate(
                    {
                        _id: details.categoryId,
                        parentId: { $ne: null },
                        status: "Active",
                    },
                    { $inc: { __v: 1 } },
                    { session }
                );

                const parent = category && await Category.findOneAndUpdate(
                    { _id: category.parentId, parentId: null, status: "Active" },
                    { $inc: { __v: 1 } },
                    { session }
                );

                if (!parent) {
                    throw new ExpressError(400, "Select an active subcategory.");
                }

                const labels = new Set(
                    details.specifications.map((item) => item.label.toLowerCase())
                );

                if (category.attributes.some((attribute) =>
                    !labels.has(attribute.toLowerCase())
                )) {
                    throw new ExpressError(
                        400,
                        "Complete the specifications required by this category."
                    );
                }
            }

            const stock = inventory.prepareVariantStock(
                previous,
                details.variants,
                {
                    sellerProfileId: seller._id,
                    productId,
                    actorUserId: req.user._id,
                    stockReason,
                    stockNote,
                }
            );

            const changes = {
                ...details,
                images,
                variants: stock.variants,
            };

            if (!editing) {
                await Product.create([{
                    _id: productId,
                    ...changes,
                    sellerProfileId: seller._id,
                    productCode: `ZP-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`,
                }], { session });
            } else {
                if (contentChanged && previous.status !== "Suspended") {
                    Object.assign(changes, {
                        status: "Pending",
                        reviewType: "Content Update",
                        submittedAt: new Date(),
                        reviewedAt: null,
                        reviewedById: null,
                        moderationReason: "",
                    });
                }

                const result = await Product.updateOne(
                    {
                        _id: productId,
                        sellerProfileId: seller._id,
                        __v: version,
                    },
                    {
                        $set: changes,
                        $inc: { __v: 1 },
                    },
                    { session, runValidators: true }
                );

                if (!result.matchedCount) {
                    throw new ExpressError(
                        409,
                        "Product changed. Reload and edit again."
                    );
                }
            }

            await inventory.recordStockMovements(stock.movements, session);
        });

        saved = true;
        previousImages = (previous?.images || [])
            .filter((image) => !imageKeys.includes(image.publicId));

        await cleanupImages(previousImages);

        res.status(editing ? 200 : 201).json({
            success: true,
            productId: String(productId),
            message: editing
                ? "Product updated successfully."
                : "Product submitted for review.",
        });
    } catch (error) {
        if (!saved) await cleanupImages(uploaded);

        if (error.code === 11000) {
            return next(
                new ExpressError(
                    409,
                    "A product with this SKU already exists in your store."
                )
            );
        }

        next(error);
    }
}

exports.createSellerProduct = saveProduct;
exports.updateSellerProduct = saveProduct;