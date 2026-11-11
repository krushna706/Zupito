const { parse } = require("csv-parse/sync");
const mongoose = require("mongoose");
const service = require("../services/bulkImportService");
const BulkImport = require("../models/BulkImport");
const ExpressError = require("../utils/ExpressError");
exports.importStock = async (req, res, next) => {
    try {
        const kind = req.path.includes("catalog") ? "catalog" : "stock";
        const columns =
            kind === "stock"
                ? ["sku", "stock"]
                : [
                      "sku",
                      "name",
                      "brand",
                      "categoryid",
                      "description",
                      "variant",
                      "price",
                      "mrp",
                      "stock",
                  ];
        let rows;
        try {
            rows = parse(new TextDecoder("utf-8", { fatal: true }).decode(req.file.buffer), {
                bom: true,
                trim: true,
                skip_empty_lines: true,
                max_record_size: 8192,
                columns: (headers) => {
                    const names = headers.map((value) => value.toLowerCase());
                    if (names.join(",") !== columns.join(",")) throw new Error("headers");
                    return names;
                },
            });
        } catch {
            throw new ExpressError(400, `Use UTF-8 CSV columns: ${columns.join(",")}.`);
        }
        if (!rows.length || rows.length > 300)
            throw new ExpressError(400, "CSV must contain 1–300 data rows.");
        res.status(202).json(await service.enqueue(req.user._id, kind, rows, req.body));
    } catch (error) {
        next(error);
    }
};
exports.status = async (req, res, next) => {
    try {
        if (!mongoose.isObjectIdOrHexString(req.params.id))
            throw new ExpressError(400, "Invalid batch.");
        const row = await BulkImport.findOne({ _id: req.params.id, userId: req.user._id });
        if (!row) throw new ExpressError(404, "Import not found in your account.");
        res.json(service.dto(row));
    } catch (error) {
        next(error);
    }
};
