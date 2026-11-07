const { randomUUID } = require("node:crypto");

const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const cloudinary = require("../config/cloudinary");
const ExpressError = require("../utils/ExpressError");

function uploadAvatar(file, userId) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                asset_folder: `zupito/profiles/${userId}`,
                public_id: `zupito/profiles/${userId}/${randomUUID()}`,
                resource_type: "image",
                allowed_formats: ["jpg", "jpeg", "png", "webp"],
                overwrite: false,
                timeout: 45000,
                transformation: [
                    { width: 512, height: 512, crop: "limit" },
                ],
            },
            (error, result) => {
                if (error || !result?.secure_url) {
                    return reject(
                        new ExpressError(
                            502,
                            "Unable to upload your picture. Please try again."
                        )
                    );
                }

                resolve(result);
            }
        );

        stream.end(file.buffer);
    });
}

// Cleanup failures must not undo a saved profile.
async function removeAvatar(publicId) {
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
            timeout: 10000,
        });
    } catch {
        console.error("Profile image cleanup failed.");
    }
}

exports.updateProfile = async (req, res, next) => {
    let uploaded;
    let saved = false;

    try {
        const current = await User.findOne({
            _id: req.user._id,
            status: "Active",
            tokenVersion: req.user.tokenVersion,
        }).select("+avatar.publicId");

        if (!current) {
            throw new ExpressError(401, "Please sign in again.");
        }

        const changes = { name: req.body.name };

        if (req.file) {
            uploaded = await uploadAvatar(req.file, current._id);

            changes.avatar = {
                url: uploaded.secure_url,
                publicId: uploaded.public_id,
            };
        }

        const sessionActive = await AuthSession.exists({
            _id: req.sessionId,
            userId: current._id,
            revokedAt: null,
            expiresAt: { $gt: new Date() },
        });

        if (!sessionActive) {
            throw new ExpressError(
                401,
                "Your session has expired. Please sign in again."
            );
        }

        // Avoid overwriting another simultaneous profile update.
        const user = await User.findOneAndUpdate(
            {
                _id: current._id,
                status: "Active",
                tokenVersion: req.user.tokenVersion,
                __v: current.__v,
            },
            {
                $set: changes,
                $inc: { __v: 1 },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        ).select("_id name avatar.url");

        if (!user) {
            throw new ExpressError(
                409,
                "Your account changed while saving. Refresh and try again."
            );
        }

        saved = true;

        if (uploaded) {
            await removeAvatar(current.avatar?.publicId);
        }

        res.json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                _id: String(user._id),
                name: user.name,
                avatar: {
                    url: user.avatar?.url || "",
                },
            },
        });
    } catch (error) {
        if (uploaded && !saved) {
            try {
                const referenced = await User.exists({
                    "avatar.publicId": uploaded.public_id,
                });

                if (!referenced) {
                    await removeAvatar(uploaded.public_id);
                }
            } catch {
                console.error("Profile image cleanup could not be verified.");
            }
        }

        next(error);
    }
};