const multer = require("multer");
const path = require("node:path");

const ExpressError = require("../utils/ExpressError");

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

const imageTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
};

function createImageUpload(fieldName, fields, maxFiles = 1) {
    const parser = multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: MAX_IMAGE_SIZE,
            files: maxFiles,
            fields,
            parts: fields + maxFiles,
            fieldSize: maxFiles > 1 ? 100 * 1024 : 2048,
            fieldNameSize: 100,
            fieldNestingDepth: 1,
            fieldArrayIndexLimit: 0,
        },
        fileFilter: (req, file, callback) => {
            const extension = path.extname(file.originalname).toLowerCase();

            if (imageTypes[extension] !== file.mimetype) {
                return callback(new ExpressError(400, "Upload JPG, JPEG, PNG or WebP images."));
            }

            callback(null, true);
        },
    });

    const upload = maxFiles === 1 ? parser.single(fieldName) : parser.array(fieldName, maxFiles);

    return (req, res, next) => {
        upload(req, res, async (error) => {
            if (error) {
                if (error instanceof multer.MulterError) {
                    const tooLarge = error.code === "LIMIT_FILE_SIZE";

                    return next(
                        new ExpressError(
                            tooLarge ? 413 : 400,
                            tooLarge
                                ? "Each image must be 3 MB or smaller."
                                : "Check the submitted fields and image count."
                        )
                    );
                }

                return next(error);
            }

            try {
                const files = req.files || (req.file ? [req.file] : []);

                if (files.length) {
                    const { fileTypeFromBuffer } = await import("file-type");

                    for (const file of files) {
                        if (!file.size || file.size > MAX_IMAGE_SIZE) {
                            throw new ExpressError(
                                400,
                                "Each image must be valid and 3 MB or smaller."
                            );
                        }

                        const detected = await fileTypeFromBuffer(file.buffer);

                        if (
                            !detected ||
                            detected.mime !== file.mimetype ||
                            !Object.values(imageTypes).includes(detected.mime)
                        ) {
                            throw new ExpressError(
                                400,
                                "A selected file is not a supported image."
                            );
                        }
                    }
                }

                next();
            } catch (error) {
                next(
                    error.statusCode
                        ? error
                        : new ExpressError(400, "Unable to read the selected image.")
                );
            }
        });
    };
}

exports.uploadProfileImage = createImageUpload("avatar", 1);
exports.uploadStoreLogo = createImageUpload("logo", 12);
exports.uploadProductImages = createImageUpload("images", 1, 4);

const stockCsvParser = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 256 * 1024,
        files: 1,
        fields: 3,
        parts: 4,
        fieldSize: 2048,
        fieldNameSize: 100,
        fieldNestingDepth: 1,
        fieldArrayIndexLimit: 0,
    },
    fileFilter: (req, file, callback) => {
        if (path.extname(file.originalname).toLowerCase() !== ".csv") {
            return callback(new ExpressError(400, "Upload a CSV file."));
        }

        callback(null, true);
    },
}).single("file");

exports.uploadStockCsv = (req, res, next) => {
    stockCsvParser(req, res, (error) => {
        if (error) {
            if (error instanceof multer.MulterError) {
                return next(
                    new ExpressError(
                        400,
                        "Upload one CSV file up to 256 KB with the required fields."
                    )
                );
            }

            return next(error);
        }

        if (!req.file?.size) {
            return next(new ExpressError(400, "Select a non-empty CSV file."));
        }

        next();
    });
};
exports.uploadComplaintImage = createImageUpload("attachment", 5);
exports.uploadReplacementImages = createImageUpload("images", 5, 3);
