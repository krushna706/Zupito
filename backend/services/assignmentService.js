
const mongoose = require("mongoose");

const DeliveryTask = require("../models/DeliveryTask");
const DeliveryAgentProfile = require("../models/DeliveryAgentProfile");
const SellerOrder = require("../models/SellerOrder");
const User = require("../models/User");
const ExpressError = require("../utils/ExpressError");
const otp = require("./deliveryOtpService");

function eligible(task) {
    return {
        status: "Active",
        availability: "Available",
        pincodes: {
            $all: [
                task.pickupPincode,
                task.deliveryPincode,
            ],
        },
        $expr: {
            $lt: ["$activeTasks", "$capacity"],
        },
    };
}

// Change parcel ownership and workload atomically.
async function assign(
    taskId,
    agentProfileId = null,
    adminId = null,
    custodyConfirmed = false
) {
    return mongoose.connection.transaction(async (session) => {
        const task = await DeliveryTask.findById(taskId)
            .select("+otpHash +otpCiphertext")
            .session(session);

        if (!task) {
            throw new ExpressError(
                404,
                "Delivery task not found."
            );
        }

        if (["delivered", "cancelled"].includes(task.stage)) {
            throw new ExpressError(
                409,
                "This parcel is already closed."
            );
        }

        if (!agentProfileId && task.agentProfileId) {
            return task;
        }

        if (
            agentProfileId &&
            String(agentProfileId) === String(task.agentProfileId)
        ) {
            return task;
        }

        if (task.custody === "Agent" && !custodyConfirmed) {
            throw new ExpressError(
                409,
                "Confirm physical return to the seller before reassignment."
            );
        }

        const profiles = await DeliveryAgentProfile.find({
            ...(agentProfileId
                ? { _id: agentProfileId }
                : {}),
            ...eligible(task),
        })
            .sort({ activeTasks: 1, _id: 1 })
            .limit(agentProfileId ? 1 : 20)
            .session(session);

        let next = null;

        // Linked User account must also be active.
        for (const candidate of profiles) {
            const exists = await User.exists({
                _id: candidate.userId,
                role: "delivery",
                status: "Active",
            }).session(session);

            if (exists) {
                next = candidate;
                break;
            }
        }

        if (!next) {
            if (agentProfileId) {
                throw new ExpressError(
                    409,
                    "Agent is unavailable, at capacity or outside coverage."
                );
            }

            return task;
        }

        const previousAgentId = task.agentProfileId;

        if (task.custody === "Agent") {
            // Admin confirms physical return before reassignment.
            const returned = await SellerOrder.updateOne(
                {
                    _id: task.sellerOrderId,
                    status: "Shipped",
                },
                {
                    $set: {
                        status: "Ready for Pickup",
                    },
                },
                { session }
            );

            if (!returned.modifiedCount) {
                throw new ExpressError(
                    409,
                    "Parcel cannot return to pickup in its current stage."
                );
            }

            task.pickedUpAt = undefined;
            task.outForDeliveryAt = undefined;
        }

        if (previousAgentId) {
            const released = await DeliveryAgentProfile.updateOne(
                {
                    _id: previousAgentId,
                    activeTasks: { $gt: 0 },
                },
                {
                    $inc: { activeTasks: -1 },
                },
                { session }
            );

            if (!released.modifiedCount) {
                throw new ExpressError(
                    409,
                    "Previous agent workload needs reconciliation."
                );
            }
        }

        const reserved = await DeliveryAgentProfile.updateOne(
            {
                _id: next._id,
                ...eligible(task),
            },
            {
                $inc: { activeTasks: 1 },
            },
            { session }
        );

        if (!reserved.modifiedCount) {
            throw new ExpressError(
                409,
                "Agent capacity changed. Refresh and retry."
            );
        }

        task.agentProfileId = next._id;
        task.stage = "assigned";
        task.custody = "Seller";
        task.assignedAt = new Date();

        task.assignmentMode = previousAgentId
            ? "Override"
            : adminId
                ? "Manual"
                : "Auto";

        task.retryAt = undefined;
        task.failedFrom = undefined;
        task.failureReason = "";
        task.failureNote = "";
        task.escalatedToAdmin = false;

        // Initial assignment keeps the seller's pickup code.
        // Reassignment invalidates the previous handover code.
        if (previousAgentId) {
            otp.clear(task);
        }

        task.events.push({
            actorUserId: adminId || undefined,
            note: previousAgentId
                ? "Parcel returned to seller; assigned to another agent."
                : `Parcel assigned (${task.assignmentMode}).`,
        });

        await task.save({ session });

        return task;
    });
}

exports.assign = assign;

// ================== AUTOMATIC ASSIGNMENT ==================
exports.assignPending = async () => {
    await require("./deliveryService")
        .reconcileReadyParcels();

    const pending = await DeliveryTask.find({
        stage: "ready_for_pickup",
        agentProfileId: null,
    })
        .select("_id")
        .sort({ createdAt: 1 })
        .limit(20)
        .lean();

    for (const row of pending) {
        try {
            await assign(row._id);
        } catch (error) {
            if (
                ![409, 11000].includes(
                    error.statusCode || error.code
                )
            ) {
                console.warn(
                    "Delivery assignment pending:",
                    String(row._id)
                );
            }
        }
    }
};
