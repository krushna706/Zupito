
import api from "./api";

// ================== DELIVERY STATUS ==================
const labels = {
    ready_for_pickup: "Ready for Pickup",
    assigned: "Assigned",
    picked_up: "Picked Up",
    out_for_delivery: "Out for Delivery",
    failed: "Delivery Failed",
    delivered: "Delivered",
    cancelled: "Cancelled",
};

let cache = {
    userId: "",
    agent: null,
    tasks: [],
};

let pending = null;

const accountId = (user) =>
    String(user?._id || user?.id || "");

const ownsCache = (user) =>
    user?.role === "delivery" &&
    Boolean(accountId(user)) &&
    cache.userId === accountId(user);

function notify() {
    window.dispatchEvent(
        new Event("zupito:delivery-updated")
    );
}

function reset(id = "") {
    cache = {
        userId: id,
        agent: null,
        tasks: [],
    };

    notify();
}

// ================== LOAD DELIVERY DATA ==================
// Keep existing data visible while refreshing.
export async function refreshDeliveryData(user) {
    const id = accountId(user);

    if (!id || user?.role !== "delivery") {
        reset();
        return;
    }

    if (cache.userId !== id) {
        reset(id);
    }

    // Share one request between mounted delivery pages.
    if (pending?.userId === id) {
        return pending.promise;
    }

    const promise = (async () => {
        const { data: profile } = await api.get(
            "/delivery/me"
        );

        const agent = profile.agent || null;

        const tasks = agent
            ? (
                await api.get("/delivery/tasks")
            ).data.tasks || []
            : [];

        // Ignore stale responses after an account switch.
        if (cache.userId !== id) return;

        cache = {
            userId: id,
            agent,
            tasks: Array.isArray(tasks) ? tasks : [],
        };

        notify();
    })();

    pending = { userId: id, promise };

    try {
        await promise;
    } finally {
        if (pending?.promise === promise) {
            pending = null;
        }
    }
}

// ================== SINGLE TASK ==================
// Opening Task Details does not clear the task list.
export async function fetchDeliveryTask(user, taskId) {
    const id = accountId(user);

    if (!id || user?.role !== "delivery") {
        return null;
    }

    const { data } = await api.get(
        `/delivery/tasks/${encodeURIComponent(taskId)}`
    );

    const task = data.task;

    if (cache.userId !== id) {
        return task;
    }

    cache = {
        ...cache,
        tasks: [
            task,
            ...cache.tasks.filter(
                (item) => item.id !== task.id
            ),
        ],
    };

    notify();

    return task;
}

// ================== CACHED AGENT / TASKS ==================
export function getDeliveryAgent(user) {
    return ownsCache(user)
        ? cache.agent
        : null;
}

export function getDeliveryTasks(
    user,
    includeHistory = false
) {
    if (!ownsCache(user)) return [];

    return cache.tasks.filter(
        (task) =>
            includeHistory ||
            !["delivered", "cancelled"].includes(
                task.stage
            )
    );
}

export function getDeliveryTask(user, taskId) {
    return getDeliveryTasks(user, true).find(
        (task) => task.id === taskId
    ) || null;
}

// ================== DISPLAY HELPERS ==================
export const deliveryTaskType = (task) =>
    task.taskType || "Customer Delivery";

export const deliveryStageLabel = (stage) =>
    labels[stage] || "Unknown";

export const isCompletedDeliveryTask = (task) =>
    ["delivered", "cancelled"].includes(task.stage);

export function formatDeliveryDate(value) {
    const date = value ? new Date(value) : null;

    if (!date || Number.isNaN(date.getTime())) {
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

// ================== ACTION VALIDATION ==================
// Send only fields required for each backend action.
function actionPayload(action, options = {}) {
    switch (action) {
        case "pickup":
            return {
                action,
                confirmed: options.confirmed === true,
                otp: String(options.otp || ""),
            };

        case "deliver":
            return {
                action,
                otp: String(options.otp || ""),
            };

        case "failed":
            return {
                action,
                reason: options.reason,
                note: String(options.note || "").trim(),
            };

        case "start_delivery":
        case "regenerate_otp":
        case "retry":
            return { action };

        default:
            throw new Error("Unsupported delivery action.");
    }
}

// ================== UPDATE TASK ==================
export async function updateDeliveryTask(
    user,
    taskId,
    action,
    options = {}
) {
    const { data } = await api.patch(
        `/delivery/tasks/${encodeURIComponent(taskId)}`,
        actionPayload(action, options)
    );

    // Fetch the complete updated record, including order items.
    return (
        await fetchDeliveryTask(user, taskId)
    ) || data.task;
}

// ================== AGENT AVAILABILITY ==================
export async function setDeliveryAvailability(
    user,
    availability
) {
    await api.patch("/delivery/availability", {
        availability,
    });

    await refreshDeliveryData(user);
}
