const { randomUUID } = require("node:crypto");

const User = require("../models/User");
const SellerProfile = require("../models/SellerProfile");
const AuthSession = require("../models/AuthSession");
const cloudinary = require("../config/cloudinary");
const ExpressError = require("../utils/ExpressError");

function storeResponse(seller) {
    return {
        _id: String(seller._id),
        userId: String(seller.userId),
        storeName: seller.storeName,
        storeEmail: seller.storeEmail,
        storePhone: seller.storePhone,
        description: seller.description || "",
        storeLogo: {
            url: seller.storeLogo?.url || "",
        },
        pickupAddress: seller.pickupAddress,
        status: seller.status,
        remarks: seller.remarks,
        version: seller.__v,
        updatedAt: seller.updatedAt,
    };
}

function uploadLogo(file, sellerProfileId) {
    return new Promise((resolve, reject) => {
        const folder = `zupito/stores/${sellerProfileId}`;

        const stream = cloudinary.uploader.upload_stream(
            {
                asset_folder: folder,
                public_id: `${folder}/${randomUUID()}`,
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
                            "Unable to upload the store logo. Please try again."
                        )
                    );
                }

                resolve(result);
            }
        );

        stream.end(file.buffer);
    });
}

async function removeLogo(publicId) {
    if (!publicId) return;

    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",
            invalidate: true,
            timeout: 10000,
        });
    } catch {
        console.error("Store logo cleanup failed.");
    }
}

// Read only the authenticated seller's store.
exports.getStoreProfile = async (req, res, next) => {
    try {
        const seller = await SellerProfile.findOne({
            userId: req.user._id,
            status: "Approved",
        });

        if (!seller) {
            throw new ExpressError(403, "Approved seller access is required.");
        }

        res.json({
            success: true,
            store: storeResponse(seller),
        });
    } catch (error) {
        next(error);
    }
};

exports.updateStoreProfile = async (req, res, next) => {
    let uploaded;
    let saved = false;

    try {
        const {
            storeName, storeEmail, storePhone, description,
            street, locality, city, state, pincode, pickupNotes,
            version, removeLogo: shouldRemoveLogo,
        } = req.body;

        if (req.file && shouldRemoveLogo) {
            throw new ExpressError(
                400,
                "Choose either a new logo or logo removal."
            );
        }

        const current = await SellerProfile.findOne({
            userId: req.user._id,
            status: "Approved",
        }).select("+storeLogo.publicId");

        if (!current) {
            throw new ExpressError(403, "Approved seller access is required.");
        }

        if (current.__v !== version) {
            throw new ExpressError(
                409,
                "Store details changed. Refresh and edit again."
            );
        }

        const changes = {
            storeName,
            storeEmail,
            storePhone,
            description,
            pickupAddress: {
                street,
                locality,
                city,
                state,
                pincode,
                pickupNotes,
            },
        };

        if (req.file) {
            uploaded = await uploadLogo(req.file, current._id);

            changes.storeLogo = {
                url: uploaded.secure_url,
                publicId: uploaded.public_id,
            };
        } else if (shouldRemoveLogo) {
            changes.storeLogo = { url: "" };
        }

        // Recheck access after an external upload.
        const [account, session] = await Promise.all([
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

        if (!account || !session) {
            throw new ExpressError(401, "Please sign in again.");
        }

        const seller = await SellerProfile.findOneAndUpdate(
            {
                _id: current._id,
                userId: req.user._id,
                status: "Approved",
                __v: version,
            },
            {
                $set: changes,
                $inc: { __v: 1 },
            },
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!seller) {
            throw new ExpressError(
                409,
                "Store details or approval changed. Refresh and try again."
            );
        }

        saved = true;

        if (uploaded || shouldRemoveLogo) {
            await removeLogo(current.storeLogo?.publicId);
        }

        res.json({
            success: true,
            message: "Store profile updated successfully.",
            store: storeResponse(seller),
        });
    } catch (error) {
        if (uploaded && !saved) {
            try {
                const referenced = await SellerProfile.exists({
                    "storeLogo.publicId": uploaded.public_id,
                });

                if (!referenced) {
                    await removeLogo(uploaded.public_id);
                }
            } catch {
                console.error("Store logo cleanup could not be verified.");
            }
        }

        next(error);
    }
};