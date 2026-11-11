const mongoose = require("mongoose");
const Replacement = require("../models/Replacement");
const Order = require("../models/Order");
const SellerOrder = require("../models/SellerOrder");
const SellerProfile = require("../models/SellerProfile");
const Product = require("../models/Product");
const Category = require("../models/Category");
const DeliveryTask = require("../models/DeliveryTask");
const StockMovement = require("../models/StockMovement");
const otp = require("./deliveryOtpService");
const ExpressError = require("../utils/ExpressError");

exports.request = (userId, values, images) =>
    mongoose.connection.transaction(async (session) => {
        const order = await Order.findOne({ _id: values.orderId, userId, status: "Confirmed" })
            .session(session)
            .lean();
        const index = Number(values.orderItemId.slice(values.orderId.length + 1));
        const item = order?.items[index];
        if (
            !Number.isInteger(index) ||
            !item ||
            values.orderItemId !== `${values.orderId}-${index}` ||
            values.quantity > item.quantity
        ) {
            throw new ExpressError(400, "Select a purchased item and valid quantity.");
        }
        const parcel = await SellerOrder.findOne({
            orderId: order._id,
            itemIndexes: index,
            status: "Delivered",
        })
            .session(session)
            .lean();
        const task =
            parcel &&
            (await DeliveryTask.findOne({
                sellerOrderId: parcel._id,
                kind: "original",
                stage: "delivered",
            })
                .session(session)
                .lean());
        const product = await Product.findById(item.productId).session(session).lean();
        const category =
            product && (await Category.findById(product.categoryId).session(session).lean());
        const policy = item.replacementPolicy || {
            allowed: category?.replacementAllowed,
            days: category?.replacementDays,
        };
        const deadline = new Date(
            new Date(task?.deliveredAt).getTime() + Number(policy.days || 0) * 86400000
        );
        if (!task?.deliveredAt || !policy.allowed || !policy.days || deadline < new Date()) {
            throw new ExpressError(409, "The replacement window is unavailable or has expired.");
        }
        const [record] = await Replacement.create(
            [
                {
                    orderId: order._id,
                    sellerOrderId: parcel._id,
                    userId,
                    sellerProfileId: item.sellerProfileId,
                    itemIndex: index,
                    item,
                    quantity: values.quantity,
                    reason: values.reason,
                    description: values.description,
                    images,
                    address: order.address,
                    deliveredAt: task.deliveredAt,
                    deadline,
                    history: [
                        {
                            status: "Requested",
                            note: "Customer requested replacement.",
                            actorUserId: userId,
                        },
                    ],
                },
            ],
            { session }
        );
        return record;
    });

async function queue(record, kind, session) {
    const seller = await SellerProfile.findById(record.sellerProfileId).session(session).lean();
    if (!seller?.pickupAddress?.pincode)
        throw new ExpressError(409, "Seller pickup address is unavailable.");
    const reverse = kind === "replacement_pickup";
    const [task] = await DeliveryTask.create(
        [
            {
                replacementId: record._id,
                sellerOrderId: record.sellerOrderId,
                orderId: record.orderId,
                kind,
                operationKey: `${kind}:${record._id}`,
                product: record.item.name,
                seller: seller.storeName,
                pickupAddress: reverse ? record.address : seller.pickupAddress,
                customerAddress: reverse ? seller.pickupAddress : record.address,
                pickupPincode: reverse ? record.address.pincode : seller.pickupAddress.pincode,
                deliveryPincode: reverse ? seller.pickupAddress.pincode : record.address.pincode,
                // Custody describes the pickup/destination role on each journey.
                custody: reverse ? "Customer" : "Seller",
                events: [
                    { note: reverse ? "Reverse pickup queued." : "Replacement delivery queued." },
                ],
            },
        ],
        { session }
    );
    otp.issue(task, "pickup");
    await task.save({ session });
}

exports.change = (user, id, values) =>
    mongoose.connection.transaction(async (session) => {
        const record = await Replacement.findById(id).session(session);
        if (!record) throw new ExpressError(404, "Replacement not found.");
        const admin = user.role === "admin";
        const seller =
            !admin &&
            (await SellerProfile.findOne({ userId: user._id, _id: record.sellerProfileId }).session(
                session
            ));
        if (!admin && !seller)
            throw new ExpressError(403, "This replacement belongs to another store.");
        const transitions = admin
            ? { approve: ["Requested"], reject: ["Requested"], reopen: ["Inspection Failed"] }
            : {
                  inspect_pass: ["Awaiting Inspection"],
                  inspect_fail: ["Awaiting Inspection"],
                  ready: ["Inspection Passed"],
              };
        if (!transitions[values.action]?.includes(record.status))
            throw new ExpressError(409, "This action is not available at the current stage.");
        const product = await Product.findById(record.item.productId).session(session);
        const variant = product?.variants.find((item) => item.variantId === record.item.variantId);
        if (values.action === "approve") {
            if (!variant || variant.stock - variant.reservedQuantity < record.quantity)
                throw new ExpressError(
                    409,
                    "Insufficient replacement stock. Request remains awaiting review."
                );
            variant.reservedQuantity += record.quantity;
            await product.save({ session });
            record.stockReserved = true;
            record.status = "Approved";
            await queue(record, "replacement_pickup", session);
        } else if (values.action === "reject") {
            record.status = "Rejected";
        } else if (values.action === "reopen") {
            record.status = "Awaiting Inspection";
        } else if (values.action === "inspect_fail") {
            record.status = "Inspection Failed";
        } else if (values.action === "inspect_pass") {
            record.status = "Inspection Passed";
            if (values.restock === true && !record.returnedRestocked) {
                if (!variant) throw new ExpressError(409, "Original variant no longer exists.");
                const before = variant.stock;
                variant.stock += record.quantity;
                await product.save({ session });
                await StockMovement.create(
                    [
                        {
                            sellerProfileId: record.sellerProfileId,
                            productId: product._id,
                            variantId: variant.variantId,
                            sku: variant.sku,
                            type: "Restock",
                            beforeQuantity: before,
                            quantityChange: record.quantity,
                            afterQuantity: variant.stock,
                            reason: "Inspected replacement return",
                            note: values.note,
                            actorUserId: user._id,
                            operationKey: `replacement-return:${record._id}`,
                        },
                    ],
                    { session }
                );
                record.returnedRestocked = true;
            }
        } else if (values.action === "ready") {
            if (
                !record.stockReserved ||
                !variant ||
                variant.reservedQuantity < record.quantity ||
                variant.stock < record.quantity
            )
                throw new ExpressError(
                    409,
                    "Reserved replacement stock needs administrator review."
                );
            const before = variant.stock;
            variant.stock -= record.quantity;
            variant.reservedQuantity -= record.quantity;
            await product.save({ session });
            await StockMovement.create(
                [
                    {
                        sellerProfileId: record.sellerProfileId,
                        productId: product._id,
                        variantId: variant.variantId,
                        sku: variant.sku,
                        type: "Sale",
                        beforeQuantity: before,
                        quantityChange: -record.quantity,
                        afterQuantity: variant.stock,
                        reason: "Replacement dispatch",
                        note: values.note,
                        actorUserId: user._id,
                        operationKey: `replacement-dispatch:${record._id}`,
                    },
                ],
                { session }
            );
            record.stockReserved = false;
            record.status = "Ready for Pickup";
            await queue(record, "replacement_delivery", session);
        }
        record.remark = values.note;
        record.history.push({ status: record.status, note: values.note, actorUserId: user._id });
        await record.save({ session });
        return record;
    });

// Called inside the delivery transaction; original parcel status is untouched.
exports.progress = async (task, phase, actorUserId, session) => {
    const expected =
        task.kind === "replacement_pickup"
            ? phase === "pickup"
                ? "Approved"
                : "Return In Transit"
            : phase === "pickup"
              ? "Ready for Pickup"
              : "Replacement Shipped";
    const status =
        task.kind === "replacement_pickup"
            ? phase === "pickup"
                ? "Return In Transit"
                : "Awaiting Inspection"
            : phase === "pickup"
              ? "Replacement Shipped"
              : "Completed";
    const result = await Replacement.updateOne(
        { _id: task.replacementId, status: expected },
        {
            $set: { status },
            $push: {
                history: {
                    status,
                    note: "Parcel handover verified by OTP.",
                    date: new Date(),
                    actorUserId,
                },
            },
        },
        { session }
    );
    if (!result.modifiedCount)
        throw new ExpressError(409, "Replacement stage changed. Refresh the task.");
};
