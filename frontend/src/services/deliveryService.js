
 // ================== DELIVERY CONFIGURATION ==================
const AGENT_KEY = "zupito_admin_delivery_agents";
const TASK_KEY = "zupito_admin_delivery_assignments";
const ORDER_KEY = "zupito_admin_orders";
const REPLACEMENT_KEY = "zupito_admin_replacements";

const DEMO_EMAIL = "delivery@zupito.test";
const DEMO_AGENT_ID = "ZA1002";

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
        const records = JSON.parse(localStorage.getItem(key));

        return Array.isArray(records) ? records : [];
    } catch {
        return [];
    }
}

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

function sameId(first, second) {
    return first != null &&
        second != null &&
        String(first) === String(second);
}

// ================== AGENT ACCOUNT ==================
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

    // Link the preview login to one predefined Admin agent.
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
    if (task.kind === "replacement_pickup") {
        return "Return Pickup";
    }

    if (task.kind === "replacement_delivery") {
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

// ================== ASSIGNED TASKS ==================
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
                sameId(item.id || item._id, task.orderId)
            );

            const replacement = replacements.find((item) =>
                sameId(item.id, task.replacementId)
            );

            const address = order?.address ||
                replacement?.customerAddress ||
                {};

            return {
                ...task,
                taskType: deliveryTaskType(task),
                customerName: order?.customerName ||
                    replacement?.customerName ||
                    "Customer",
                customerPhone: address.phone || "",
                customerAddress: address,
                pickupAddress: task.pickupAddress ||
                    replacement?.sellerPickupAddress ||
                    "",
                sellerName: task.seller ||
                    replacement?.seller ||
                    "Seller",
                pickupPincode: task.pickupPincode ||
                    replacement?.sellerPincode ||
                    "",
                deliveryPincode: task.deliveryPincode ||
                    replacement?.customerPincode ||
                    address.pincode ||
                    "",
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

            const firstPriority = priority[first.stage] ?? 5;
            const secondPriority = priority[second.stage] ?? 5;

            if (firstPriority !== secondPriority) {
                return firstPriority - secondPriority;
            }

            return new Date(
                second.assignedAt || second.createdAt || 0
            ) - new Date(
                first.assignedAt || first.createdAt || 0
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
    });
}
