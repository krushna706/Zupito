const StockMovement = require("../models/StockMovement");
const ExpressError = require("../utils/ExpressError");
const mongoose = require("mongoose");
const { createHash } = require("node:crypto");

const Product = require("../models/Product");
const SellerProfile = require("../models/SellerProfile");

exports.prepareVariantStock = (
    previous,
    variants,
    { sellerProfileId, productId, actorUserId, stockReason, stockNote }
) => {
    const oldVariants = new Map(
        (previous?.variants || []).map((variant) => [variant.variantId, variant])
    );

    const nextIds = new Set(variants.map((variant) => variant.variantId));
    const movements = [];

    for (const old of oldVariants.values()) {
        if (
            !nextIds.has(old.variantId) &&
            (old.stock > 0 || old.reservedQuantity > 0)
        ) {
            throw new ExpressError(
                400,
                `${old.sku}: Save zero stock before removing this variant.`
            );
        }
    }

    const updated = variants.map((variant) => {
        const old = oldVariants.get(variant.variantId);
        const before = old?.stock || 0;
        const reservedQuantity = old?.reservedQuantity || 0;
        const after = variant.stock;

        if (old && old.sku !== variant.sku) {
            throw new ExpressError(
                400,
                "Existing variant SKUs cannot be changed."
            );
        }

        if (after < reservedQuantity) {
            throw new ExpressError(
                400,
                `${variant.sku}: Stock cannot be below reserved quantity.`
            );
        }

        if (!old || before !== after) {
            if (old && !stockReason) {
                throw new ExpressError(400, "Select a stock movement reason.");
            }

            if (old && stockReason === "Restock" && after < before) {
                throw new ExpressError(400, "Restock cannot reduce stock.");
            }

            if (old && stockReason === "Damage/Loss" && after > before) {
                throw new ExpressError(400, "Damage/Loss cannot increase stock.");
            }

            if (old && stockReason !== "Restock" && !stockNote) {
                throw new ExpressError(
                    400,
                    "Explain the manual stock correction."
                );
            }

            movements.push({
                sellerProfileId,
                productId,
                variantId: variant.variantId,
                sku: variant.sku,
                type: old ? stockReason : "Opening",
                beforeQuantity: before,
                quantityChange: after - before,
                afterQuantity: after,
                reason: old
                    ? `${stockReason} from Product Form`
                    : "Opening stock for new variant",
                note: stockNote,
                actorUserId,
            });
        }

        return { ...variant, reservedQuantity };
    });

    return { variants: updated, movements };
};

exports.recordStockMovements = async (movements, session) => {
    if (movements.length) {
        await StockMovement.insertMany(movements, { session });
    }
};

const escapeInventoryRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function getInventorySeller(userId) {
    const seller = await SellerProfile.findOne({
        userId,
        status: "Approved",
    }).select("_id");

    if (!seller) {
        throw new ExpressError(403, "Approved seller access is required.");
    }

    return seller;
}

exports.getInventory = async (userId, options) => {
    const seller = await getInventorySeller(userId);
    const { search, status, threshold, page, limit } = options;
    const filter = {};

    if (search) {
        const pattern = new RegExp(escapeInventoryRegex(search), "i");
        filter.$or = [
            { name: pattern },
            { productCode: pattern },
            { "variants.sku": pattern },
            { "variants.label": pattern },
        ];
    }

    if (status === "In Stock") filter.available = { $gt: threshold };
    if (status === "Low Stock") filter.available = { $gt: 0, $lte: threshold };
    if (status === "Out of Stock") filter.available = { $lte: 0 };
    if (status === "Needs Attention") filter.available = { $lte: threshold };

    const [result] = await Product.aggregate([
        { $match: { sellerProfileId: seller._id } },
        { $unwind: "$variants" },
        {
            $set: {
                available: {
                    $subtract: ["$variants.stock", "$variants.reservedQuantity"],
                },
            },
        },
        {
            $facet: {
                rows: [
                    { $match: filter },
                    { $sort: { name: 1, "variants.sku": 1, _id: 1 } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 0,
                            productId: "$_id",
                            productName: "$name",
                            productCode: 1,
                            variantId: "$variants.variantId",
                            sku: "$variants.sku",
                            label: "$variants.label",
                            pricePaise: "$variants.pricePaise",
                            onHand: "$variants.stock",
                            reserved: "$variants.reservedQuantity",
                            available: 1,
                            approval: "$status",
                            version: "$__v",
                            image: {
                                $arrayElemAt: ["$images.url", "$variants.imageIndex"],
                            },
                        },
                    },
                ],
                count: [{ $match: filter }, { $count: "total" }],
                statistics: [
                    {
                        $group: {
                            _id: null,
                            skus: { $sum: 1 },
                            onHand: { $sum: "$variants.stock" },
                            reserved: { $sum: "$variants.reservedQuantity" },
                            available: { $sum: "$available" },
                            low: {
                                $sum: {
                                    $cond: [
                                        {
                                            $and: [
                                                { $gt: ["$available", 0] },
                                                { $lte: ["$available", threshold] },
                                            ],
                                        },
                                        1,
                                        0,
                                    ],
                                },
                            },
                            out: {
                                $sum: {
                                    $cond: [{ $lte: ["$available", 0] }, 1, 0],
                                },
                            },
                        },
                    },
                ],
            },
        },
    ]);

    return {
        rows: result.rows,
        total: result.count[0]?.total || 0,
        statistics: result.statistics[0] || {
            skus: 0, onHand: 0, reserved: 0, available: 0, low: 0, out: 0,
        },
    };
};

exports.getInventoryHistory = async (userId, options) => {
    const seller = await getInventorySeller(userId);
    const { search, sku, type, page, limit } = options;

    const base = { sellerProfileId: seller._id };

    if (sku) base.sku = sku;
    if (type !== "All") base.type = type;

    const filter = {};

    if (search) {
        const pattern = new RegExp(escapeInventoryRegex(search), "i");

        filter.$or = [
            { sku: pattern },
            { reason: pattern },
            { reference: pattern },
            { "product.name": pattern },
        ];
    }

    const [result] = await StockMovement.aggregate([
        { $match: base },
        {
            $lookup: {
                from: Product.collection.name,
                localField: "productId",
                foreignField: "_id",
                as: "product",
            },
        },
        { $set: { product: { $arrayElemAt: ["$product", 0] } } },
        { $match: filter },
        {
            $facet: {
                rows: [
                    { $sort: { createdAt: -1, _id: -1 } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                    {
                        $project: {
                            productId: 1,
                            productName: "$product.name",
                            variantId: 1,
                            sku: 1,
                            type: 1,
                            beforeQuantity: 1,
                            quantityChange: 1,
                            afterQuantity: 1,
                            reason: 1,
                            note: 1,
                            reference: 1,
                            source: { $ifNull: ["$source", "product_form"] },
                            actorUserId: 1,
                            createdAt: 1,
                        },
                    },
                ],
                count: [{ $count: "total" }],
            },
        },
    ]);

    return {
        rows: result.rows,
        total: result.count[0]?.total || 0,
    };
};

// Product quantity and movement record commit together.
exports.changeInventoryStock = async (userId, values, source = "manual") => {
    const { sku, mode, quantity, reason, reference, version, operationId } = values;

    if (
        !Number.isInteger(quantity) ||
        quantity < 0 ||
        quantity > 999999 ||
        (mode !== "set" && quantity === 0)
    ) {
        throw new ExpressError(400, "Enter a valid stock quantity.");
    }

    const operationKey = source === "csv"
        ? `csv:${reference}:${sku}`
        : `manual:${operationId}`;

    const requestHash = createHash("sha256")
        .update(JSON.stringify({ sku, mode, quantity, reason, reference }))
        .digest("hex");

    const seller = await getInventorySeller(userId);

    const checkPrevious = (movement) => {
        if (movement.requestHash !== requestHash) {
            throw new ExpressError(
                409,
                "This operation reference was already used with different values."
            );
        }

        return {
            outcome: "Skipped",
            before: movement.beforeQuantity,
            after: movement.afterQuantity,
        };
    };

    try {
        return await mongoose.connection.transaction(async (session) => {
            const previous = await StockMovement.findOne({
                sellerProfileId: seller._id,
                operationKey,
            }).select("+requestHash").session(session);

            if (previous) return checkPrevious(previous);

            const activeSeller = await SellerProfile.findOneAndUpdate(
                { _id: seller._id, status: "Approved" },
                { $inc: { __v: 1 } },
                { session }
            );

            if (!activeSeller) {
                throw new ExpressError(403, "Approved seller access is required.");
            }

            const product = await Product.findOne({
                sellerProfileId: seller._id,
                "variants.sku": sku,
            }).session(session);

            if (!product) {
                throw new ExpressError(404, "SKU not found in your store.");
            }

            if (source === "manual" && product.__v !== version) {
                throw new ExpressError(
                    409,
                    "Inventory changed. Close this form, refresh and try again."
                );
            }

            const variant = product.variants.find((item) => item.sku === sku);
            const before = variant.stock;

            const after = mode === "add"
                ? before + quantity
                : mode === "remove" ? before - quantity : quantity;

            if (
                !Number.isSafeInteger(after) ||
                after < variant.reservedQuantity ||
                after > 999999
            ) {
                throw new ExpressError(
                    400,
                    "Resulting stock must cover reserved quantity and stay within 999999."
                );
            }

            const updated = await Product.updateOne(
                { _id: product._id, __v: product.__v },
                {
                    $set: { "variants.$[item].stock": after },
                    $inc: { __v: 1 },
                },
                {
                    session,
                    runValidators: true,
                    arrayFilters: [{ "item.variantId": variant.variantId }],
                }
            );

            if (!updated.matchedCount) {
                throw new ExpressError(409, "Inventory changed. Please retry.");
            }

            await StockMovement.create([{
                sellerProfileId: seller._id,
                productId: product._id,
                variantId: variant.variantId,
                sku,
                type: mode === "add"
                    ? "Restock"
                    : mode === "remove" ? "Damage/Loss" : "Adjustment",
                beforeQuantity: before,
                quantityChange: after - before,
                afterQuantity: after,
                reason,
                reference,
                source,
                operationKey,
                requestHash,
                actorUserId: userId,
            }], { session });

            return {
                outcome: after === before ? "Unchanged" : "Updated",
                before,
                after,
            };
        });
    } catch (error) {
        if (error.code === 11000) {
            const previous = await StockMovement.findOne({
                sellerProfileId: seller._id,
                operationKey,
            }).select("+requestHash");

            if (previous) return checkPrevious(previous);
        }

        throw error;
    }
};