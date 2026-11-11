const mongoose = require("mongoose");
const Joi = require("joi");
const User = require("../models/User");
const Review = require("../models/Review");
const Order = require("../models/Order");
const SellerOrder = require("../models/SellerOrder");
const Product = require("../models/Product");
const SellerProfile = require("../models/SellerProfile");
const ExpressError = require("../utils/ExpressError");
const schemas = require("../validations/schema");

exports.create = async (req, res, next) => {
    try {
        const { value, error } = schemas.reviewSchema.validate(req.body);
        if (error) throw new ExpressError(400, error.details[0].message);
        await mongoose.connection.transaction(async (session) => {
            const order = await Order.findOne({
                _id: value.orderId,
                userId: req.user._id,
                status: "Confirmed",
            })
                .session(session)
                .lean();
            const index = Number(value.orderItemId.slice(value.orderId.length + 1));
            const item = order?.items[index];
            if (
                !Number.isInteger(index) ||
                !item ||
                value.orderItemId !== `${value.orderId}-${index}`
            ) {
                throw new ExpressError(404, "Purchased item not found.");
            }
            const parcel = await SellerOrder.exists({
                orderId: order._id,
                itemIndexes: index,
                status: "Delivered",
            }).session(session);
            if (!parcel) throw new ExpressError(409, "Only delivered purchases can be reviewed.");
            await Review.create(
                [
                    {
                        userId: req.user._id,
                        orderId: order._id,
                        itemIndex: index,
                        productId: item.productId,
                        sellerProfileId: item.sellerProfileId,
                        customerName: req.user.name,
                        productName: item.name,
                        image: item.image,
                        rating: value.rating,
                        comment: value.comment,
                    },
                ],
                { session }
            );
            await Product.updateOne(
                { _id: item.productId },
                { $inc: { ratingSum: value.rating, ratingCount: 1 } },
                { session }
            );
        });
        res.status(201).json({ success: true });
    } catch (error) {
        next(
            error.code === 11000
                ? new ExpressError(409, "You already reviewed this purchased item.")
                : error
        );
    }
};
exports.list = async (req, res, next) => {
    try {
        let filter = {};
        if (req.params.productId) {
            if (!mongoose.isObjectIdOrHexString(req.params.productId))
                throw new ExpressError(400, "Invalid product.");
            filter = { productId: req.params.productId, status: "Published" };
        } else if (req.user.role === "seller") {
            const seller = await SellerProfile.findOne({ userId: req.user._id })
                .select("_id")
                .lean();
            if (!seller) throw new ExpressError(403, "Seller profile required.");
            filter.sellerProfileId = seller._id;
        }
        const rows = await Review.find(filter).sort({ createdAt: -1 }).limit(500).lean();
        const authors = req.params.productId
            ? await User.find({ _id: { $in: rows.map((row) => row.userId) } })
                  .select("name avatar.url")
                  .lean()
            : [];
        const authorById = new Map(authors.map((user) => [String(user._id), user]));
        const reviews = rows.map((row) => {
            if (!req.params.productId) {
                return { ...row, id: String(row._id), productId: String(row.productId) };
            }

            const author = authorById.get(String(row.userId));
            return {
                id: String(row._id),
                author: author?.name || row.customerName,
                avatar: author?.avatar?.url || "",
                rating: row.rating,
                comment: row.comment,
                createdAt: row.createdAt,
                sellerReply: row.sellerReply,
                verifiedPurchase: true,
            };
        });
        res.json({
            reviews,
            products: req.params.productId
                ? undefined
                : rows.map((row) => ({
                      _id: String(row.productId),
                      name: row.productName,
                      image: row.image,
                  })),
        });
    } catch (error) {
        next(error);
    }
};
exports.moderate = async (req, res, next) => {
    try {
        const { value, error } = schemas.reviewModerationSchema.validate(req.body);
        if (error || !mongoose.isObjectIdOrHexString(req.params.id))
            throw new ExpressError(400, "Invalid review update.");
        await mongoose.connection.transaction(async (session) => {
            const row = await Review.findById(req.params.id).session(session);
            if (!row) throw new ExpressError(404, "Review not found.");
            if (row.status === value.status) return;
            const delta = Number(value.status === "Published") - Number(row.status === "Published");
            await Product.updateOne(
                { _id: row.productId },
                { $inc: { ratingSum: row.rating * delta, ratingCount: delta } },
                { session }
            );
            row.moderationHistory.push({
                from: row.status,
                to: value.status,
                reason: value.reason,
                date: new Date(),
                actorUserId: req.user._id,
            });
            row.status = value.status;
            row.moderationReason = value.reason;
            await row.save({ session });
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// Sellers can reply only to published feedback belonging to their store.
exports.reply = async (req, res, next) => {
    try {
        const { value, error } = Joi.object({
            text: Joi.string().trim().min(10).max(700).required(),
        }).validate(req.body);
        if (error || !mongoose.isObjectIdOrHexString(req.params.id))
            throw new ExpressError(400, "Write a reply between 10 and 700 characters.");
        if (
            /https?:\/\/|www\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d\s-]{8,}\d)/i.test(value.text)
        )
            throw new ExpressError(400, "Remove contact details and links from the public reply.");
        const seller = await SellerProfile.findOne({ userId: req.user._id }).lean();
        const result =
            seller &&
            (await Review.updateOne(
                { _id: req.params.id, sellerProfileId: seller._id, status: "Published" },
                {
                    $set: {
                        sellerReply: {
                            text: value.text,
                            storeName: seller.storeName,
                            updatedAt: new Date(),
                        },
                    },
                }
            ));
        if (!result?.matchedCount)
            throw new ExpressError(404, "Published review not found for your store.");
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// Return only delivered, unreviewed items belonging to the signed-in customer.
exports.eligibility = async (req, res, next) => {
    try {
        const productId = req.params.productId;
        if (!mongoose.isObjectIdOrHexString(productId))
            throw new ExpressError(400, "Invalid product.");
        const orders = await Order.find({
            userId: req.user._id,
            status: "Confirmed",
            "items.productId": productId,
        })
            .select("items")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        const ids = orders.map((order) => order._id);
        const [parcels, reviews] = await Promise.all([
            SellerOrder.find({ orderId: { $in: ids }, status: "Delivered" })
                .select("orderId itemIndexes")
                .lean(),
            Review.find({ userId: req.user._id, productId }).select("orderId itemIndex").lean(),
        ]);
        let purchase = null;
        for (const order of orders) {
            const index = order.items.findIndex(
                (item, index) =>
                    String(item.productId) === productId &&
                    parcels.some(
                        (parcel) =>
                            String(parcel.orderId) === String(order._id) &&
                            parcel.itemIndexes.includes(index)
                    ) &&
                    !reviews.some(
                        (review) =>
                            String(review.orderId) === String(order._id) &&
                            review.itemIndex === index
                    )
            );
            if (index >= 0) {
                const item = order.items[index];
                purchase = {
                    orderId: String(order._id),
                    item: {
                        orderItemId: `${order._id}-${index}`,
                        productId,
                        variantId: item.variantId,
                        name: item.name,
                        image: item.image,
                        variantLabel: item.variantLabel,
                    },
                };
                break;
            }
        }
        res.json({ purchase, reviewed: reviews.length > 0 });
    } catch (error) {
        next(error);
    }
};
