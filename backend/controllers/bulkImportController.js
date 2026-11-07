const { parse } = require("csv-parse/sync");

const inventoryService = require("../services/inventoryService");
const { inventoryCsvRowSchema } = require("../validations/schema");
const ExpressError = require("../utils/ExpressError");

exports.importStock = async (req, res, next) => {
    try {
        let rows;

        try {
            const text = new TextDecoder("utf-8", { fatal: true })
                .decode(req.file.buffer);

            rows = parse(text, {
                bom: true,
                trim: true,
                skip_empty_lines: true,
                max_record_size: 1024,
                columns: (headers) => {
                    const names = headers.map((header) => header.toLowerCase());

                    if (
                        names.length !== 2 ||
                        names[0] !== "sku" ||
                        names[1] !== "stock"
                    ) {
                        throw new Error("Invalid headers");
                    }

                    return names;
                },
            });
        } catch {
            throw new ExpressError(
                400,
                "Use a valid UTF-8 CSV with exactly these columns: sku,stock."
            );
        }

        if (!rows.length || rows.length > 300) {
            throw new ExpressError(400, "CSV must contain 1–300 data rows.");
        }

        const { mode, reason, reference } = req.body;
        const seen = new Set();
        const results = [];

        for (const [index, row] of rows.entries()) {
            const { value, error } = inventoryCsvRowSchema.validate(row);
            const rowNumber = index + 2;

            if (error) {
                results.push({
                    row: rowNumber,
                    sku: String(row.sku || ""),
                    outcome: "Failed",
                    message: error.details[0].message,
                });
                continue;
            }

            if (seen.has(value.sku)) {
                results.push({
                    row: rowNumber,
                    sku: value.sku,
                    outcome: "Failed",
                    message: "Duplicate SKU in this CSV.",
                });
                continue;
            }

            seen.add(value.sku);

            try {
                const result = await inventoryService.changeInventoryStock(
                    req.user._id,
                    {
                        sku: value.sku,
                        mode,
                        quantity: Number(value.stock),
                        reason,
                        reference,
                    },
                    "csv"
                );

                results.push({
                    row: rowNumber,
                    sku: value.sku,
                    ...result,
                    message: result.outcome === "Skipped"
                        ? "Already processed for this batch reference."
                        : "Processed successfully.",
                });
            } catch (error) {
                if (
                    !error.statusCode ||
                    error.statusCode >= 500 ||
                    [401, 403].includes(error.statusCode)
                ) {
                    throw error;
                }

                results.push({
                    row: rowNumber,
                    sku: value.sku,
                    outcome: "Failed",
                    message: error.message,
                });
            }
        }

        res.json({
            success: true,
            reference,
            results,
            summary: {
                updated: results.filter((row) => row.outcome === "Updated").length,
                unchanged: results.filter((row) => row.outcome === "Unchanged").length,
                skipped: results.filter((row) => row.outcome === "Skipped").length,
                failed: results.filter((row) => row.outcome === "Failed").length,
            },
        });
    } catch (error) {
        next(error);
    }
};