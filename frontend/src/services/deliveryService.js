
 // ================== DELIVERY CONFIGURATION ==================
const AGENT_KEY = "zupito_admin_delivery_agents";
const TASK_KEY = "zupito_admin_delivery_assignments";
const ORDER_KEY = "zupito_admin_orders";
const REPLACEMENT_KEY = "zupito_admin_replacements";

const DEMO_EMAIL = "delivery@zupito.test";
const DEMO_AGENT_ID = "ZA1002";
const MAX_FAILURES = 3;
const MAX_OTP_ATTEMPTS = 5;

export const deliveryStages = {
    ready_for_pickup: "Ready for Pickup",
    assigned: "Assigned",
    picked_up: "Picked Up",
    out_for_delivery: "Out for Delivery",
    failed: "Delivery Failed",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

// ================== STORAGE HELPERS ==================
function readList(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}

function sameId(first, second) {
    return first != null &&
        second != null &&
        String(first) === String(second);
}

function saveChanges(changes) {
    const previous = changes.map(([key]) => [
        key,
        localStorage.getItem(key),
    ]);

    try {
        for (const [key, records] of changes) {
            localStorage.setItem(key, JSON.stringify(records));
        }
    } catch {
        for (const [key, value] of previous) {
            try {
                if (value === null) {
                    localStorage.removeItem(key);
                } else {
                    localStorage.setItem(key, value);
                }
            } catch {
                // Backend transactions will replace preview storage.
            }
        }

        throw new Error(
            "Unable to save changes. Check browser storage and retry."
        );
    }
}

function createPreviewOtp() {
    const number = new Uint32Array(1);

    crypto.getRandomValues(number);

    return String(number[0] % 1000000).padStart(6, "0");
}

function addTaskEvent(task, stage, note, now) {
    return {
        ...task,
        stage,
        updatedAt: now,
        events: [
            ...(task.events || []),
            {
                date: now,
                note,
            },
        ],
    };
}

function isReturnPickup(task) {
    return task.kind === "replacement_pickup";
}

function isReplacementDelivery(task) {
    return task.kind === "replacement_delivery";
}

// ================== AGENT IDENTITY ==================
export function getDeliveryAgent(user) {
    if (
        !user ||
        !["delivery", "delivery_agent"].includes(user.role)
    ) {
        return null;
    }

    const agents = readList(AGENT_KEY);

    const matched = agents.find((agent) =>
        sameId(agent.id, user.agentId) ||
        (
            user.email &&
            normalize(agent.email) === normalize(user.email)
        )
    );

    if (matched) return matched;

    // Only the fixed frontend demo login uses this sample agent.
    if (
        user.id === "delivery" &&
        normalize(user.email) === DEMO_EMAIL
    ) {
        return agents.find((agent) =>
            agent.id === DEMO_AGENT_ID
        ) || null;
    }

    return null;
}

// ================== TASK CLASSIFICATION ==================
export function deliveryTaskType(task) {
    if (isReturnPickup(task)) {
        return "Return Pickup";
    }

    if (isReplacementDelivery(task)) {
        return "Replacement Delivery";
    }

    return "Customer Delivery";
}

export function deliveryStageLabel(stage) {
    return deliveryStages[stage] || "Unknown";
}

export function isCompletedDeliveryTask(task) {
    return ["delivered", "cancelled"].includes(task.stage);
}

// ================== TASK READS ==================
export function getDeliveryTasks(user, includeHistory = false) {
    const agent = getDeliveryAgent(user);

    if (!agent || agent.status !== "Active") {
        return [];
    }

    const orders = readList(ORDER_KEY);
    const replacements = readList(REPLACEMENT_KEY);

    return readList(TASK_KEY)
        .filter((task) =>
            sameId(task.agentId, agent.id)
        )
        .filter((task) =>
            includeHistory || !isCompletedDeliveryTask(task)
        )
        .map((task) => {
            const order = orders.find((item) =>
                sameId(
                    item.id || item._id,
                    task.orderId
                )
            );

            const replacement = replacements.find((item) =>
                sameId(item.id, task.replacementId)
            );

            const address = order?.address ||
                replacement?.customerAddress ||
                {};

            const reverse = isReturnPickup(task);

            return {
                ...task,
                taskType: deliveryTaskType(task),

                customerName: order?.customerName ||
                    order?.address?.name ||
                    replacement?.customerName ||
                    "Customer",

                customerPhone: address.phone ||
                    replacement?.customerPhone ||
                    "",

                customerAddress: address,

                pickupAddress: task.pickupAddress ||
                    (
                        reverse
                            ? replacement?.customerAddress
                            : replacement?.sellerPickupAddress
                    ) ||
                    "",

                sellerAddress: replacement?.sellerPickupAddress || "",

                sellerName: task.seller ||
                    replacement?.seller ||
                    "Seller",

                pickupPincode: task.pickupPincode || "",

                deliveryPincode: task.deliveryPincode ||
                    address.pincode ||
                    "",

                hasLinkedOrder: Boolean(order),
                hasLinkedReplacement: Boolean(replacement),
            };
        })
        .sort((first, second) => {
            const priority = {
                failed: 0,
                out_for_delivery: 1,
                picked_up: 2,
                assigned: 3,
                ready_for_pickup: 4,
            };

            const difference =
                (priority[first.stage] ?? 5) -
                (priority[second.stage] ?? 5);

            return difference ||
                new Date(
                    second.assignedAt ||
                    second.createdAt ||
                    0
                ) -
                new Date(
                    first.assignedAt ||
                    first.createdAt ||
                    0
                );
        });
}

export function getDeliveryTask(user, taskId) {
    return getDeliveryTasks(user, true).find((task) =>
        sameId(task.id, taskId)
    ) || null;
}

// ================== DATE FORMATTING ==================
export function formatDeliveryDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
    });
}

// ================== TASK TRANSITIONS ==================
export function updateDeliveryTask(
    user,
    taskId,
    action,
    options = {}
) {
    const agent = getDeliveryAgent(user);

    if (!agent || agent.status !== "Active") {
        throw new Error(
            "Your delivery account is not active or linked."
        );
    }

    const tasks = readList(TASK_KEY);
    const orders = readList(ORDER_KEY);
    const replacements = readList(REPLACEMENT_KEY);
    const agents = readList(AGENT_KEY);

    const index = tasks.findIndex((item) =>
        sameId(item.id, taskId)
    );

    if (
        index < 0 ||
        !sameId(tasks[index].agentId, agent.id)
    ) {
        throw new Error(
            "This task is not assigned to your account."
        );
    }

    const current = tasks[index];
    const now = new Date().toISOString();
    const note = String(options.note || "").trim();
    const attempts = Number(current.attempts || 0);

    const orderIndex = orders.findIndex((item) =>
        sameId(
            item.id || item._id,
            current.orderId
        )
    );

    const replacementIndex = replacements.findIndex((item) =>
        sameId(item.id, current.replacementId)
    );

    const order = orders[orderIndex];

    const parcelIndex = order?.parcels?.findIndex((parcel) =>
        sameId(
            parcel.id || parcel._id,
            current.parcelId
        )
    ) ?? -1;

    const replacement = replacements[replacementIndex];

    let next = { ...current };
    let otpVerified = false;
    let closeTask = false;

    if (["delivered", "cancelled"].includes(current.stage)) {
        throw new Error("This task is already closed.");
    }

    // ================== PICKUP CONFIRMATION ==================
    if (action === "pickup") {
        if (current.stage !== "assigned") {
            throw new Error(
                "Only an assigned parcel can be picked up."
            );
        }

        if (!options.confirmed) {
            throw new Error(
                "Confirm that you physically received the parcel."
            );
        }

        next = addTaskEvent(
            current,
            "picked_up",
            "Parcel physically collected by agent.",
            now
        );

        next.custody = "Agent";
        next.pickedUpAt = now;
    }

    // ================== START DELIVERY ==================
    else if (action === "start_delivery") {
        if (current.stage !== "picked_up") {
            throw new Error(
                "Collect the parcel before starting delivery."
            );
        }

        next = addTaskEvent(
            current,
            "out_for_delivery",
            isReturnPickup(current)
                ? "Agent is returning the original item to the seller."
                : "Agent started the final delivery route.",
            now
        );

        next.outForDeliveryAt = now;

        // Demo-only OTP; production OTP must be generated by the API.
        if (!isReturnPickup(current)) {
            if (order && parcelIndex >= 0) {
                const parcel = order.parcels[parcelIndex];

                if (
                    !parcel.deliveryOtp &&
                    !parcel.delivery?.otp
                ) {
                    const otp = createPreviewOtp();

                    order.parcels[parcelIndex] = {
                        ...parcel,
                        deliveryOtp: otp,
                    };
                }
            } else if (
                isReplacementDelivery(current) &&
                replacement
            ) {
                if (!replacement.deliveryOtp) {
                    replacements[replacementIndex] = {
                        ...replacement,
                        deliveryOtp: createPreviewOtp(),
                    };
                }
            }
        }
    }

    // ================== FAILED DELIVERY ==================
    else if (action === "failed") {
        if (
            !["assigned", "out_for_delivery"].includes(
                current.stage
            )
        ) {
            throw new Error(
                "Failure can only be recorded for an active pickup or delivery attempt."
            );
        }

        const reason = String(options.reason || "").trim();

        const allowedReasons = [
            "Customer unavailable",
            "Incorrect address",
            "Customer requested reschedule",
            "Pickup location unavailable",
            "Vehicle issue",
            "Other",
        ];

        if (!allowedReasons.includes(reason)) {
            throw new Error("Select a valid failure reason.");
        }

        if (
            reason === "Other" &&
            (note.length < 5 || note.length > 200)
        ) {
            throw new Error(
                "Describe the issue in 5–200 characters."
            );
        }

        const failureCount = attempts + 1;
        const escalated = failureCount >= MAX_FAILURES;

        next = addTaskEvent(
            current,
            "failed",
            `${reason}${note ? `: ${note}` : ""}${
                escalated ? " (Escalated to Admin)" : ""
            }`,
            now
        );

        next.failedFrom = current.stage;
        next.failureReason = reason;
        next.failureNote = note;
        next.attempts = failureCount;
        next.lastFailedAt = now;
        next.escalatedToAdmin = escalated;
    }

    // ================== RETRY FAILED TASK ==================
    else if (action === "retry") {
        if (
            current.stage !== "failed" ||
            attempts >= MAX_FAILURES ||
            current.escalatedToAdmin
        ) {
            throw new Error(
                "Retry is unavailable. Admin must review this task."
            );
        }

        const restore = [
            "assigned",
            "out_for_delivery",
        ].includes(current.failedFrom)
            ? current.failedFrom
            : current.custody === "Agent"
                ? "out_for_delivery"
                : "assigned";

        next = addTaskEvent(
            current,
            restore,
            "Agent started another delivery attempt.",
            now
        );

        next.failureReason = "";
        next.failureNote = "";
        next.retriedAt = now;
    }

    // ================== COMPLETE DELIVERY ==================
    else if (action === "deliver") {
        if (current.stage !== "out_for_delivery") {
            throw new Error(
                "Mark the parcel Out for Delivery first."
            );
        }

        if (isReturnPickup(current)) {
            if (!options.confirmed) {
                throw new Error(
                    "Confirm physical handover of the returned item to the seller."
                );
            }
        } else {
            const expectedOtp =
                order && parcelIndex >= 0
                    ? order.parcels[parcelIndex].deliveryOtp ||
                      order.parcels[parcelIndex].delivery?.otp
                    : isReplacementDelivery(current)
                        ? replacement?.deliveryOtp
                        : null;

            if (!expectedOtp) {
                throw new Error(
                    "Customer OTP is unavailable for this task. Link the order or replacement first."
                );
            }

            if (
                Number(current.otpAttempts || 0) >=
                MAX_OTP_ATTEMPTS
            ) {
                throw new Error(
                    "OTP attempts exceeded. Contact Admin."
                );
            }

            const input = String(options.otp || "").trim();

            if (!/^\d{6}$/.test(input)) {
                throw new Error(
                    "Enter the customer's 6-digit delivery OTP."
                );
            }

            if (input !== String(expectedOtp)) {
                const nextAttempts =
                    Number(current.otpAttempts || 0) + 1;

                tasks[index] = {
                    ...current,
                    otpAttempts: nextAttempts,
                    otpLocked:
                        nextAttempts >= MAX_OTP_ATTEMPTS,
                };

                saveChanges([
                    [TASK_KEY, tasks],
                ]);

                throw new Error(
                    nextAttempts >= MAX_OTP_ATTEMPTS
                        ? "Incorrect OTP. Verification locked; contact Admin."
                        : `Incorrect OTP. ${
                            MAX_OTP_ATTEMPTS - nextAttempts
                        } attempt(s) remaining.`
                );
            }

            otpVerified = true;
        }

        next = addTaskEvent(
            current,
            "delivered",
            isReturnPickup(current)
                ? "Original replacement item handed over to the seller."
                : "Customer OTP verified and parcel delivered.",
            now
        );

        next.custody = isReturnPickup(current)
            ? "Seller"
            : "Customer";

        next.deliveredAt = now;
        next.otpVerified = otpVerified;
        closeTask = true;
    } else {
        throw new Error("Unsupported delivery action.");
    }

    tasks[index] = next;

    // ================== ORDER STATUS SYNC ==================
    if (order && parcelIndex >= 0) {
        const parcel = order.parcels[parcelIndex];

        const updatedParcel = {
            ...parcel,
            status: next.stage,
            deliveryStatus: next.stage,

            eventTimestamps: {
                ...(parcel.eventTimestamps || {}),

                ...(action === "pickup"
                    ? {
                        pickedUpAt: now,
                        shippedAt: now,
                    }
                    : {}),

                ...(action === "start_delivery"
                    ? { outForDeliveryAt: now }
                    : {}),

                ...(action === "deliver"
                    ? { deliveredAt: now }
                    : {}),
            },

            ...(otpVerified
                ? {
                    otpVerified: true,
                    deliveryOtp: null,

                    delivery: {
                        ...(parcel.delivery || {}),
                        otpVerified: true,
                        otp: null,
                    },
                }
                : {}),
        };

        const parcels = order.parcels.map((item, position) =>
            position === parcelIndex
                ? updatedParcel
                : item
        );

        orders[orderIndex] = {
            ...order,
            parcels,

            orderStatus: parcels.every((item) =>
                item.status === "delivered"
            )
                ? "delivered"
                : parcels.length === 1
                    ? next.stage
                    : "processing",

            activity: [
                ...(order.activity || []),

                {
                    type: next.stage,
                    date: now,
                    parcelId: current.parcelId,
                    note: next.events.at(-1).note,
                },
            ],
        };
    }

    // ================== REPLACEMENT STATUS SYNC ==================
    if (replacement) {
        let status = replacement.status;

        if (isReturnPickup(current)) {
            if (action === "pickup") {
                status = "Picked Up";
            }

            if (action === "deliver") {
                status = "Inspection";
            }
        } else if (isReplacementDelivery(current)) {
            if (action === "start_delivery") {
                status = "Out for Delivery";
            }

            if (
                action === "deliver" &&
                replacement.dispatchedAt
            ) {
                status = "Completed";
            }
        }

        if (status !== replacement.status) {
            replacements[replacementIndex] = {
                ...replacements[replacementIndex],
                status,

                ...(action === "deliver" &&
                isReturnPickup(current)
                    ? { returnReceivedAt: now }
                    : {}),

                ...(action === "deliver" &&
                isReplacementDelivery(current)
                    ? { deliveryOtp: null }
                    : {}),

                history: [
                    ...(replacement.history || []),

                    {
                        status,
                        date: now,
                        note: next.events.at(-1).note,
                    },
                ],
            };
        } else if (
            action === "deliver" &&
            isReplacementDelivery(current)
        ) {
            replacements[replacementIndex] = {
                ...replacements[replacementIndex],
                deliveryOtp: null,
            };
        }
    }

    // ================== AGENT WORKLOAD ==================
    if (closeTask) {
        const agentIndex = agents.findIndex((item) =>
            sameId(item.id, agent.id)
        );

        if (agentIndex >= 0) {
            agents[agentIndex] = {
                ...agents[agentIndex],

                activeTasks: Math.max(
                    0,
                    Number(
                        agents[agentIndex].activeTasks || 0
                    ) - 1
                ),

                completedTasks:
                    Number(
                        agents[agentIndex].completedTasks || 0
                    ) + 1,
            };
        }
    }

    // ================== SAVE RECORDS ==================
    const changes = [
        [TASK_KEY, tasks],
    ];

    if (order && parcelIndex >= 0) {
        changes.push([ORDER_KEY, orders]);
    }

    if (replacement) {
        changes.push([REPLACEMENT_KEY, replacements]);
    }

    if (closeTask) {
        changes.push([AGENT_KEY, agents]);
    }

    saveChanges(changes);

    return next;
}
