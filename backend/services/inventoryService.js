const StockMovement = require("../models/StockMovement");
const ExpressError = require("../utils/ExpressError");

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