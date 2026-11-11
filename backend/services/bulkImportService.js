const { createHash, randomUUID } = require("node:crypto");
const mongoose = require("mongoose");
const Joi = require("joi");
const BulkImport = require("../models/BulkImport");
const Product = require("../models/Product");
const SellerProfile = require("../models/SellerProfile");
const Category = require("../models/Category");
const StockMovement = require("../models/StockMovement");
const inventory = require("./inventoryService");
const ExpressError = require("../utils/ExpressError");
const { inventoryCsvRowSchema } = require("../validations/schema");
const catalogSchema = Joi.object({
    sku: Joi.string()
        .trim()
        .uppercase()
        .pattern(/^[A-Z0-9_-]{3,30}$/)
        .required(),
    name: Joi.string().trim().min(3).max(150).required(),
    brand: Joi.string().trim().min(2).max(80).required(),
    categoryid: Joi.string().hex().length(24).required(),
    description: Joi.string().trim().min(20).max(5000).required(),
    variant: Joi.string().trim().min(1).max(80).required(),
    price: Joi.number().positive().max(10000000).precision(2).required(),
    mrp: Joi.number().min(Joi.ref("price")).max(10000000).precision(2).required(),
    stock: Joi.number().integer().min(0).max(999999).required(),
});
exports.enqueue = async (userId, kind, rows, options) => {
    const hash = createHash("sha256").update(JSON.stringify({ kind, rows, options })).digest("hex");
    let record = await BulkImport.findOne({ userId, reference: options.reference });
    if (record && record.hash !== hash)
        throw new ExpressError(409, "This batch reference already belongs to different data.");
    if (!record) {
        try {
            record = await BulkImport.create({
                userId,
                kind,
                rows,
                options,
                reference: options.reference,
                hash,
                count: rows.length,
            });
        } catch (error) {
            if (error.code !== 11000) throw error;
            record = await BulkImport.findOne({ userId, reference: options.reference });
            if (record.hash !== hash)
                throw new ExpressError(409, "Batch reference already exists with different data.");
        }
    }
    return exports.dto(record);
};
exports.dto = (row) => ({
    id: String(row._id),
    status: row.status,
    reference: row.reference,
    count: row.count,
    processed: row.cursor,
    results: row.results,
    summary: Object.fromEntries(
        ["Updated", "Unchanged", "Skipped", "Failed"].map((key) => [
            key.toLowerCase(),
            row.results.filter((result) => result.outcome === key).length,
        ])
    ),
});
async function catalogRow(batch, values) {
    return mongoose.connection.transaction(async (session) => {
        const seller = await SellerProfile.findOneAndUpdate(
            { userId: batch.userId, status: "Approved" },
            { $inc: { __v: 1 } },
            { session }
        );
        if (!seller) throw new ExpressError(403, "Approved seller account required.");
        const existing = await Product.findOne({
            sellerProfileId: seller._id,
            "variants.sku": values.sku,
        }).session(session);
        const operationKey = `catalog:${batch.reference}:${values.sku}`;
        if (
            await StockMovement.exists({ sellerProfileId: seller._id, operationKey }).session(
                session
            )
        )
            return { outcome: "Skipped", message: "Previously imported row." };
        const category = await Category.findOne({
            _id: values.categoryid,
            status: "Active",
            parentId: { $ne: null },
        })
            .session(session)
            .lean();
        if (
            !category ||
            !(await Category.exists({ _id: category.parentId, status: "Active" }).session(session))
        )
            throw new ExpressError(400, "Choose an active subcategory ID.");
        if (existing)
            throw new ExpressError(
                409,
                "SKU already exists. Use the product form for content edits or the stock CSV for quantities."
            );
        const id = new mongoose.Types.ObjectId();
        const variantId = randomUUID();
        await Product.create(
            [
                {
                    _id: id,
                    sellerProfileId: seller._id,
                    productCode: `ZP-${String(id).toUpperCase()}`,
                    name: values.name,
                    brand: values.brand,
                    categoryId: category._id,
                    description: values.description,
                    images: [],
                    variants: [
                        {
                            variantId,
                            sku: values.sku,
                            label: values.variant,
                            pricePaise: Math.round(values.price * 100),
                            mrpPaise: Math.round(values.mrp * 100),
                            stock: values.stock,
                            reservedQuantity: 0,
                            imageIndex: 0,
                        },
                    ],
                    status: "Pending",
                    moderationReason:
                        "Add product images and required specifications before approval.",
                },
            ],
            { session }
        );
        await StockMovement.create(
            [
                {
                    sellerProfileId: seller._id,
                    productId: id,
                    variantId,
                    sku: values.sku,
                    type: "Opening",
                    beforeQuantity: 0,
                    quantityChange: values.stock,
                    afterQuantity: values.stock,
                    reason: "Catalog CSV import",
                    source: "csv",
                    reference: batch.reference,
                    operationKey,
                    actorUserId: batch.userId,
                },
            ],
            { session }
        );
        return {
            outcome: "Updated",
            message:
                "Listing created. Upload images and specifications in the product form; admin approval is required.",
        };
    });
}
exports.process = async () => {
    const batches = await BulkImport.find({ status: "Pending" })
        .select("+rows")
        .sort({ createdAt: 1 })
        .limit(5);
    for (const batch of batches) {
        const end = Math.min(batch.cursor + 25, batch.count);
        while (batch.cursor < end) {
            const index = batch.cursor;
            const input = batch.rows[index];
            const { value, error } = (
                batch.kind === "stock" ? inventoryCsvRowSchema : catalogSchema
            ).validate(input);
            let result;
            try {
                if (error) throw new ExpressError(400, error.details[0].message);
                if (
                    batch.rows
                        .slice(0, index)
                        .some((row) => String(row.sku).toUpperCase() === value.sku)
                )
                    throw new ExpressError(400, "Duplicate SKU in this CSV.");
                result =
                    batch.kind === "stock"
                        ? await inventory.changeInventoryStock(
                              batch.userId,
                              { ...batch.options, sku: value.sku, quantity: Number(value.stock) },
                              "csv"
                          )
                        : await catalogRow(batch, value);
            } catch (error) {
                if (!error.statusCode || error.statusCode >= 500) throw error;
                result = { outcome: "Failed", message: error.message };
            }
            const row = {
                row: index + 2,
                sku: String(input.sku || ""),
                message: "Processed successfully.",
                ...result,
            };
            const updated = await BulkImport.updateOne(
                { _id: batch._id, cursor: index },
                {
                    $push: { results: row },
                    $inc: { cursor: 1 },
                    ...(index + 1 === batch.count ? { $set: { status: "Completed" } } : {}),
                }
            );
            if (!updated.modifiedCount) break;
            batch.cursor += 1;
        }
    }
};
