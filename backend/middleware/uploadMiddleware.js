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

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 1,
        fields: 1,
        parts: 2,
        fieldSize: 1024,
        fieldNameSize: 100,
        fieldNestingDepth: 1,
        fieldArrayIndexLimit: 0,
    },

    fileFilter: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();

        if (imageTypes[extension] !== file.mimetype) {
            return callback(
                new ExpressError(400, "Upload a JPG, JPEG, PNG or WebP image.")
            );
        }

        callback(null, true);
    },
}).single("avatar");

// Validate uploaded bytes before sending them to Cloudinary.
function uploadProfileImage(req, res, next) {
    upload(req, res, async (error) => {
        if (error) {
            if (error instanceof multer.MulterError) {
                const tooLarge = error.code === "LIMIT_FILE_SIZE";

                return next(
                    new ExpressError(
                        tooLarge ? 413 : 400,
                        tooLarge
                            ? "Profile picture must be 3 MB or smaller."
                            : "Submit your name and only one profile picture."
                    )
                );
            }

            return next(error);
        }

        if (!req.file) {
            return next();
        }

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
                    : new ExpressError(400, "Unable to read the selected image.")
            );
        }
    });
}

module.exports = { uploadProfileImage };