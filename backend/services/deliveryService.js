
const mongoose = require("mongoose");

const DeliveryTask = require("../models/DeliveryTask");
const DeliveryAgentProfile = require("../models/DeliveryAgentProfile");
const SellerProfile = require("../models/SellerProfile");
const SellerOrder = require("../models/SellerOrder");
const Order = require("../models/Order");
const ExpressError = require("../utils/ExpressError");
const otpService = require("./deliveryOtpService");

const RETRY_DELAY_MS = 30 * 60 * 1000;

const allowedReasons = [
    "Customer unavailable",
    "Incorrect address",
    "Customer requested reschedule",
    "Pickup location unavailable",
    "Vehicle issue",
    "Other",
    "Customer refused delivery",
];

const retryable = new Set(
    allowedReasons.filter(
        (value) => value !== "Customer refused delivery"
    )
);

// ================== QUEUE SELLER PARCEL ==================
// Ready for Pickup creates one task with its seller pickup OTP.
exports.queueSellerParcel = async (order, parcel, session) => {
    const seller = await SellerProfile.findById(
        parcel.sellerProfileId
    ).session(session).lean();

    const pickupPincode = seller?.pickupAddress?.pincode;
    const deliveryPincode = order.address?.pincode;

    if (
        !/^[1-9]\d{5}$/.test(pickupPincode || "") ||
        !/^[1-9]\d{5}$/.test(deliveryPincode || "")
    ) {
        throw new ExpressError(
            409,
            "Seller pickup or customer delivery pincode is unavailable."
        );
    }

    const product = parcel.itemIndexes
        .map((index) => order.items[index]?.name)
        .filter(Boolean)
        .join(", ")
        .slice(0, 250);

    const operationKey = `original:${parcel._id}`;

    const task = await DeliveryTask.findOneAndUpdate(
        { operationKey },
        {
            $setOnInsert: {
                operationKey,
                sellerOrderId: parcel._id,
                orderId: order._id,
                product,
                seller: seller.storeName,
                pickupAddress: seller.pickupAddress,
                customerAddress: order.address,
                pickupPincode,
                deliveryPincode,
                stage: "ready_for_pickup",
                custody: "Seller",
                events: [{
                    note: "Seller marked parcel Ready for Pickup.",
                }],
            },
        },
        {
            upsert: true,
            new: true,
            session,
        }
    ).select("+otpHash +otpCiphertext");

    if (
        !task.otpHash &&
        task.stage === "ready_for_pickup"
    ) {
        otpService.issue(task, "pickup");
        await task.save({ session });
    }
};

// ================== PARCEL RECONCILIATION ==================
// Recover parcels which became ready before this integration.
exports.reconcileReadyParcels = async () => {
    const parcels = await SellerOrder.find({
        status: "Ready for Pickup",
    })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean();

    for (const parcel of parcels) {
        const operationKey = `original:${parcel._id}`;

        if (await DeliveryTask.exists({ operationKey })) {
            continue;
        }

        try {
            await mongoose.connection.transaction(
                async (session) => {
                    const ready = await SellerOrder.findOne({
                        _id: parcel._id,
                        status: "Ready for Pickup",
                    }).session(session);

                    const order = ready &&
                        await Order.findOne({
                            _id: parcel.orderId,
                            status: "Confirmed",
                        })
                            .session(session)
                            .lean();

                    if (order) {
                        await exports.queueSellerParcel(
                            order,
                            ready,
                            session
                        );
                    }
                }
            );
        } catch (error) {
            if (error.code !== 11000) {
                console.warn(
                    "Delivery task reconciliation pending:",
                    String(parcel._id)
                );
            }
        }
    }
};

// ================== SELLER PICKUP OTP ==================
// Only the authenticated owning seller can request this code.
exports.sellerPickupCode = (
    sellerId,
    orderId,
    parcelId,
    regenerate = false
) => mongoose.connection.transaction(async (session) => {
    const parcel = await SellerOrder.findOne({
        _id: parcelId,
        orderId,
        sellerProfileId: sellerId,
        status: "Ready for Pickup",
    }).session(session);

    if (!parcel) {
        throw new ExpressError(
            404,
            "Pickup parcel is not available for your store."
        );
    }

    const task = await DeliveryTask.findOne({
        sellerOrderId: parcelId,
        orderId,
        kind: "original",
        stage: {
            $in: ["ready_for_pickup", "assigned"],
        },
    })
        .select("+otpHash +otpCiphertext")
        .session(session);

    if (!task) {
        throw new ExpressError(
            404,
            "Pickup task not found."
        );
    }

    const expired =
        !task.otpExpiresAt ||
        task.otpExpiresAt <= new Date();

    const missing =
        !task.otpHash ||
        !task.otpCiphertext;

    const locked = task.otpAttempts >= 5;

    if (regenerate) {
        if (task.otpRegenerations >= 3) {
            throw new ExpressError(
                429,
                "Pickup OTP regeneration limit reached. Contact Admin."
            );
        }

        if (
            task.otpIssuedAt &&
            Date.now() - task.otpIssuedAt.getTime() < 60000 &&
            !expired &&
            !locked
        ) {
            throw new ExpressError(
                429,
                "Wait 60 seconds before regenerating OTP."
            );
        }

        task.otpRegenerations += 1;
    }

    // Existing assigned parcels may not yet have a pickup OTP.
    if (regenerate || expired || missing) {
        if (expired && !regenerate) {
            task.otpRegenerations = 0;
        }

        otpService.issue(task, "pickup");

        task.events.push({
            note: regenerate
                ? "Seller regenerated pickup OTP."
                : "Pickup OTP issued to seller.",
        });

        await task.save({ session });
    }

    return {
        otp: otpService.code(task),
        expiresAt: task.otpExpiresAt,
        attemptsRemaining: Math.max(
            0,
            5 - task.otpAttempts
        ),
    };
});

// ================== SAFE TASK RESPONSE ==================
// OTP values never leave the server through agent APIs.
exports.taskResponse = (task) => ({
    id: String(task._id),
    parcelId: String(task.sellerOrderId),
    orderId: String(task.orderId),
    kind: task.kind,
    product: task.product,
    seller: task.seller,
    sellerName: task.seller,
    sellerAddress: task.pickupAddress,
    agentId: task.agentProfileId
        ? String(task.agentProfileId)
        : null,
    pickupAddress: task.pickupAddress,
    customerAddress: task.customerAddress,
    customerName:
        task.customerAddress?.name || "Customer",
    customerPhone:
        task.customerAddress?.phone || "",
    pickupPincode: task.pickupPincode,
    deliveryPincode: task.deliveryPincode,
    stage: task.stage,
    custody: task.custody,
    assignmentMode: task.assignmentMode,
    assignedAt: task.assignedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    pickedUpAt: task.pickedUpAt,
    outForDeliveryAt: task.outForDeliveryAt,
    deliveredAt: task.deliveredAt,
    failedFrom: task.failedFrom,
    failureReason: task.failureReason,
    failureNote: task.failureNote,
    attempts: task.attempts,
    lastFailedAt: task.lastFailedAt,
    retryAt: task.retryAt,
    escalatedToAdmin: task.escalatedToAdmin,
    otpAttempts: task.otpAttempts,
    otpLocked: task.otpAttempts >= 5,
    otpExpiresAt: task.otpExpiresAt,
    events: task.events,
    taskType: task.kind === "original"
        ? "Customer Delivery"
        : task.kind === "replacement_pickup"
            ? "Return Pickup"
            : "Replacement Delivery",
    hasLinkedOrder: true,
});

// ================== AGENT ACTIONS ==================
exports.action = async (
    userId,
    taskId,
    action,
    options = {}
) => {
    let incorrectOtp = null;

    const changed = await mongoose.connection.transaction(
        async (session) => {
            const agent = await DeliveryAgentProfile.findOne({
                userId,
                status: "Active",
            }).session(session);

            if (!agent) {
                throw new ExpressError(
                    403,
                    "Active delivery-agent account required."
                );
            }

            const task = await DeliveryTask.findOne({
                _id: taskId,
                agentProfileId: agent._id,
            })
                .select("+otpHash +otpCiphertext")
                .session(session);

            if (!task) {
                throw new ExpressError(
                    404,
                    "Assigned task not found."
                );
            }

            if (
                ["delivered", "cancelled"].includes(task.stage)
            ) {
                throw new ExpressError(
                    409,
                    "Task is already closed."
                );
            }

            const now = new Date();
            let note = "";

            // ================== PICKUP ==================
            if (action === "pickup") {
                if (
                    task.stage !== "assigned" ||
                    options.confirmed !== true
                ) {
                    throw new ExpressError(
                        409,
                        "Confirm physical pickup of an assigned parcel."
                    );
                }

                // Agent must obtain the code directly from seller.
                if (!otpService.verify(task, options.otp)) {
                    task.otpAttempts += 1;
                    await task.save({ session });

                    incorrectOtp = task.otpAttempts >= 5
                        ? "Incorrect pickup OTP. Verification locked; ask seller to regenerate."
                        : `Incorrect pickup OTP. ${5 - task.otpAttempts} attempt(s) remaining.`;

                    return task;
                }

                const result = await SellerOrder.updateOne(
                    {
                        _id: task.sellerOrderId,
                        status: "Ready for Pickup",
                    },
                    {
                        $set: {
                            status: "Shipped",
                        },
                    },
                    { session }
                );

                if (!result.modifiedCount) {
                    throw new ExpressError(
                        409,
                        "Seller parcel status changed. Refresh and retry."
                    );
                }

                task.stage = "picked_up";
                task.custody = "Agent";
                task.pickedUpAt = now;

                otpService.clear(task);
                task.otpRegenerations = 0;

                note = "Seller pickup OTP verified; parcel collected by agent.";

            // ================== START DELIVERY ==================
            } else if (action === "start_delivery") {
                if (task.stage !== "picked_up") {
                    throw new ExpressError(
                        409,
                        "Confirm pickup before starting delivery."
                    );
                }

                task.stage = "out_for_delivery";
                task.outForDeliveryAt = now;

                otpService.issue(task);

                note = "Out for Delivery. Customer OTP generated.";

            // ================== REGENERATE DELIVERY OTP ==================
            } else if (action === "regenerate_otp") {
                if (task.stage !== "out_for_delivery") {
                    throw new ExpressError(
                        409,
                        "Delivery is not active."
                    );
                }

                if (
                    task.otpAttempts >= 5 ||
                    task.otpRegenerations >= 3
                ) {
                    throw new ExpressError(
                        429,
                        "OTP verification is locked. Contact Admin."
                    );
                }

                if (
                    task.otpIssuedAt &&
                    now - task.otpIssuedAt < 60000
                ) {
                    throw new ExpressError(
                        429,
                        "Wait 60 seconds before generating another OTP."
                    );
                }

                task.otpRegenerations += 1;
                otpService.issue(task);

                note = "Delivery OTP regenerated. Previous code invalidated.";

            // ================== DELIVER ==================
            } else if (action === "deliver") {
                if (task.stage !== "out_for_delivery") {
                    throw new ExpressError(
                        409,
                        "Start delivery before verification."
                    );
                }

                if (!otpService.verify(task, options.otp)) {
                    task.otpAttempts += 1;
                    await task.save({ session });

                    incorrectOtp = task.otpAttempts >= 5
                        ? "Incorrect OTP. Verification locked; contact Admin."
                        : `Incorrect OTP. ${5 - task.otpAttempts} attempt(s) remaining.`;

                    return task;
                }

                const parcelResult = await SellerOrder.updateOne(
                    {
                        _id: task.sellerOrderId,
                        status: "Shipped",
                    },
                    {
                        $set: {
                            status: "Delivered",
                        },
                    },
                    { session }
                );

                if (!parcelResult.modifiedCount) {
                    throw new ExpressError(
                        409,
                        "Parcel status changed. Refresh and retry."
                    );
                }

                const workloadResult =
                    await DeliveryAgentProfile.updateOne(
                        {
                            _id: agent._id,
                            activeTasks: { $gt: 0 },
                        },
                        {
                            $inc: {
                                activeTasks: -1,
                                completedTasks: 1,
                            },
                        },
                        { session }
                    );

                if (!workloadResult.modifiedCount) {
                    throw new ExpressError(
                        409,
                        "Agent workload needs reconciliation."
                    );
                }

                task.stage = "delivered";
                task.custody = "Customer";
                task.deliveredAt = now;

                otpService.clear(task);

                note = "Customer OTP verified and parcel delivered.";

            // ================== FAILED DELIVERY ==================
            } else if (action === "failed") {
                if (
                    ![
                        "assigned",
                        "out_for_delivery",
                    ].includes(task.stage)
                ) {
                    throw new ExpressError(
                        409,
                        "Failure cannot be recorded at this stage."
                    );
                }

                if (!allowedReasons.includes(options.reason)) {
                    throw new ExpressError(
                        400,
                        "Select a valid failure reason."
                    );
                }

                if (
                    options.reason === "Other" &&
                    !/^.{5,200}$/.test(
                        (options.note || "").trim()
                    )
                ) {
                    throw new ExpressError(
                        400,
                        "Describe the issue in 5–200 characters."
                    );
                }

                task.failedFrom = task.stage;
                task.stage = "failed";
                task.attempts += 1;
                task.failureReason = options.reason;
                task.failureNote =
                    (options.note || "").trim();
                task.lastFailedAt = now;

                task.escalatedToAdmin =
                    task.attempts >= 3 ||
                    !retryable.has(options.reason);

                task.retryAt = task.escalatedToAdmin
                    ? undefined
                    : new Date(
                        now.getTime() + RETRY_DELAY_MS
                    );

                otpService.clear(task);

                note = `${task.failureReason}${
                    task.failureNote
                        ? `: ${task.failureNote}`
                        : ""
                }.`;

            // ================== RETRY ==================
            } else if (action === "retry") {
                if (
                    task.stage !== "failed" ||
                    task.escalatedToAdmin ||
                    task.attempts >= 3
                ) {
                    throw new ExpressError(
                        409,
                        "Retry requires Admin review."
                    );
                }

                task.stage = task.custody === "Agent"
                    ? "picked_up"
                    : "assigned";

                task.retryAt = undefined;
                task.failureReason = "";
                task.failureNote = "";

                note = "Delivery retry started.";

            } else {
                throw new ExpressError(
                    400,
                    "Unsupported delivery action."
                );
            }

            task.events.push({
                note,
                date: now,
                actorUserId: userId,
            });

            await task.save({ session });

            return task;
        }
    );

    // Wrong attempts must commit before returning the error.
    if (incorrectOtp) {
        throw new ExpressError(
            incorrectOtp.includes("locked")
                ? 429
                : 400,
            incorrectOtp
        );
    }

    return exports.taskResponse(changed);
};

// ================== AUTOMATIC RETRIES ==================
exports.retryDue = async () => {
    const due = await DeliveryTask.find({
        stage: "failed",
        escalatedToAdmin: false,
        retryAt: { $lte: new Date() },
    })
        .select("_id")
        .limit(20)
        .lean();

    for (const row of due) {
        try {
            await mongoose.connection.transaction(
                async (session) => {
                    const task = await DeliveryTask.findOne({
                        _id: row._id,
                        stage: "failed",
                        retryAt: { $lte: new Date() },
                        escalatedToAdmin: false,
                    }).session(session);

                    if (!task) return;

                    task.stage = task.custody === "Agent"
                        ? "picked_up"
                        : "assigned";

                    task.retryAt = undefined;
                    task.failureReason = "";
                    task.failureNote = "";

                    task.events.push({
                        note: "Scheduled retry is ready for agent action.",
                    });

                    await task.save({ session });
                }
            );
        } catch {
            console.warn(
                "Delivery retry pending:",
                String(row._id)
            );
        }
    }
};
