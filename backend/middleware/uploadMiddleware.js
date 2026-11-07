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

function createImageUpload(fieldName, fields) {
    const upload = multer({
        storage: multer.memoryStorage(),

        limits: {
            fileSize: MAX_IMAGE_SIZE,
            files: 1,
            fields,
            parts: fields + 1,
            fieldSize: 2048,
            fieldNameSize: 100,
            fieldNestingDepth: 1,
            fieldArrayIndexLimit: 0,
        },

        fileFilter: (req, file, callback) => {
            const extension = path.extname(file.originalname).toLowerCase();

            if (imageTypes[extension] !== file.mimetype) {
                return callback(
                    new ExpressError(
                        400,
                        "Upload a JPG, JPEG, PNG or WebP image."
                    )
                );
            }

            callback(null, true);
        },
    }).single(fieldName);

    return (req, res, next) => {
        upload(req, res, async (error) => {
            if (error) {
                if (error instanceof multer.MulterError) {
                    const tooLarge = error.code === "LIMIT_FILE_SIZE";

                    return next(
                        new ExpressError(
                            tooLarge ? 413 : 400,
                            tooLarge
                                ? "Image must be 3 MB or smaller."
                                : "Check the submitted fields and upload only one image."
                        )
                    );
                }

                return next(error);
            }

            if (!req.file) return next();

            try {
                if (!req.file.size || req.file.size > MAX_IMAGE_SIZE) {
                    throw new ExpressError(
                        400,
                        "Image must be valid and 3 MB or smaller."
                    );
                }

                const { fileTypeFromBuffer } = await import("file-type");
                const detected = await fileTypeFromBuffer(req.file.buffer);

                if (
                    !detected ||
                    detected.mime !== req.file.mimetype ||
                    !Object.values(imageTypes).includes(detected.mime)
                ) {
                    throw new ExpressError(
                        400,
                        "The selected file is not a supported image."
                    );
                }

                next();
            } catch (error) {
                next(
                    error.statusCode
                        ? error
                        : new ExpressError(
                            400,
                            "Unable to read the selected image."
                        )
                );
            }
        });
    };
}

exports.uploadProfileImage = createImageUpload("avatar", 1);
exports.uploadStoreLogo = createImageUpload("logo", 12);