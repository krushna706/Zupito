const mongoose = require("mongoose");
const Settlement = require("../models/Settlement");
const SellerOrder = require("../models/SellerOrder");
const Order = require("../models/Order");
const DeliveryTask = require("../models/DeliveryTask");
const Replacement = require("../models/Replacement");
const Complaint = require("../models/Complaint");
const ExpressError = require("../utils/ExpressError");
const { allocation } = require("./refundService");

async function held(parcel, session) {
    const [replacement, complaint] = await Promise.all([
        Replacement.exists({
            sellerOrderId: parcel._id,
            status: { $nin: ["Completed", "Rejected"] },
        }).session(session),
        Complaint.exists({
            orderId: parcel.orderId,
            status: { $in: ["Open", "In Progress"] },
        }).session(session),
    ]);
    return Boolean(replacement || complaint);
}

// Prepare statements only after the maximum replacement window has elapsed.
// Shipping is retained by the platform; seller earnings use net item sales.
exports.prepare = async () => {
    const delivered = await DeliveryTask.find({
        kind: "original",
        stage: "delivered",
        deliveredAt: { $lte: new Date(Date.now() - 31 * 86400000) },
    })
        .select("sellerOrderId")
        .lean();
    for (const task of delivered) {
        try {
            await mongoose.connection.transaction(async (session) => {
                if (await Settlement.exists({ sellerOrderId: task.sellerOrderId }).session(session))
                    return;
                const parcel = await SellerOrder.findOne({
                    _id: task.sellerOrderId,
                    status: "Delivered",
                })
                    .session(session)
                    .lean();
                if (!parcel || (await held(parcel, session))) return;
                const order = await Order.findOne({ _id: parcel.orderId, status: "Confirmed" })
                    .session(session)
                    .lean();
                if (!order) return;
                const parcels = await SellerOrder.find({ orderId: order._id })
                    .session(session)
                    .lean();
                const share = allocation(order, parcels).get(String(parcel._id));
                const bps = parcel.commissionBps ?? 1000;
                const commission = Math.round(((share.gross - share.couponShare) * bps) / 10000);
                await Settlement.create(
                    [
                        {
                            sellerProfileId: parcel.sellerProfileId,
                            sellerOrderId: parcel._id,
                            orderId: order._id,
                            batch: new Date().toISOString().slice(0, 10),
                            grossPaise: share.gross,
                            discountPaise: share.couponShare,
                            commissionPaise: commission,
                            payablePaise: share.gross - share.couponShare - commission,
                            commissionBps: bps,
                        },
                    ],
                    { session }
                );
            });
        } catch (error) {
            if (error.code !== 11000) throw error;
        }
    }
};

exports.confirm = (id, userId, values) =>
    mongoose.connection.transaction(async (session) => {
        const row = await Settlement.findOne({ _id: id, status: "Pending" }).session(session);
        if (!row) throw new ExpressError(409, "Pending settlement not found or already confirmed.");
        await Order.updateOne({ _id: row.orderId }, { $inc: { __v: 1 } }, { session });
        const parcel = await SellerOrder.findById(row.sellerOrderId).session(session).lean();
        if (!parcel || parcel.status !== "Delivered" || (await held(parcel, session)))
            throw new ExpressError(409, "An unresolved order issue holds this settlement.");
        if (Math.round(values.amount * 100) !== row.payablePaise)
            throw new ExpressError(400, "Confirmation amount must match the statement exactly.");
        row.status = "Paid";
        row.reference = values.reference;
        row.paidAt = new Date(values.paidAt);
        row.confirmedBy = userId;
        await row.save({ session });
        await require("./auditService").record(
            userId,
            "Settlement confirmed",
            row._id,
            values.reference,
            session
        );
        return row;
    });
