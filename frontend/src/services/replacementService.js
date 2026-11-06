
import {
    applyInventoryMovements,
    ensureStockHistory,
    getCategories,
    getProducts,
    getStoreName,
    inventoryRows,
    ownProducts,
    saveProducts,
    sellerKey,
} from "./sellerService";

// ================== CONFIGURATION ==================
const REQUEST_KEY = "zupito_admin_replacements";
const PRODUCT_KEY = "zupito_admin_products";
const TASK_KEY = "zupito_admin_delivery_assignments";
const AGENT_KEY = "zupito_admin_delivery_agents";
const ORDER_KEY = "zupito_admin_orders";
const STORE_KEY = "zupito_seller_store_profiles";

const activeStatuses = [
    "Approved",
    "Pickup Assigned",
    "Picked Up",
    "Inspection",
    "Replacement Ready",
    "Out for Delivery",
];

// ================== STORAGE HELPERS ==================
function readList(key) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return Array.isArray(value) ? value : [];
    } catch {
        return [];
    }
}

function saveList(key, records) {
    localStorage.setItem(key, JSON.stringify(records));
}

function normalize(value) {
    return String(value || "").trim().toLowerCase();
}

// ================== SELLER OWNERSHIP ==================
function ownsRequest(request, user) {
    if (request.sellerId || request.sellerEmail) {
        const sameId = user?.id &&
            String(request.sellerId) === String(user.id);

        const sameEmail = user?.email &&
            normalize(request.sellerEmail) === normalize(user.email);

        return Boolean(sameId || sameEmail);
    }

    // Legacy Admin previews identify sellers by store name.
    return normalize(request.seller) === normalize(getStoreName(user));
}

function findTask(tasks, request, kind) {
    const linkedId = kind === "replacement_pickup"
        ? request.pickupTaskId
        : request.deliveryTaskId;

    return tasks.find((task) => {
        const sameId = linkedId &&
            String(task.id) === String(linkedId);

        const sameReplacement = String(task.replacementId) ===
            String(request.id) &&
            task.kind === kind;

        return sameId || sameReplacement;
    }) || null;
}

function appendEvent(request, status, note) {
    return {
        ...request,
        status,
        history: [
            ...(request.history || []),
            {
                status,
                date: new Date().toISOString(),
                note,
            },
        ],
    };
}

// ================== PRODUCT HELPERS ==================
function findProductVariant(request, products) {
    const product = products.find((item) =>
        String(item.id || item._id) === String(request.productId)
    );

    if (!product) {
        return { error: "Product no longer exists." };
    }

    const hasVariants = Array.isArray(product.variants) &&
        product.variants.length > 0;

    const variant = hasVariants
        ? product.variants.find((item, index) =>
            String(item.id ?? index) === String(request.variantId)
        )
        : product;

    if (!variant) {
        return {
            error: "Original product variant is unavailable.",
        };
    }

    const variantId = hasVariants
        ? String(variant.id ?? product.variants.indexOf(variant))
        : "base";

    return {
        product,
        variant,
        variantId,
        sku: String(
            variant.sku || product.productCode || product.id
        ).toUpperCase(),
    };
}

function availableQuantity(variant) {
    const reserved = Number(
        variant.reservedStock ??
        variant.reservedQuantity ??
        0
    ) || 0;

    return Number(variant.stock || 0) - reserved;
}

function findAgent(task, agents) {
    return agents
        .filter((agent) => {
            const pincodes = Array.isArray(agent.pincodes)
                ? agent.pincodes
                : [];

            return agent.status === "Active" &&
                agent.availability === "Available" &&
                Number(agent.activeTasks) < Number(agent.capacity) &&
                pincodes.includes(task.pickupPincode) &&
                pincodes.includes(task.deliveryPincode);
        })
        .sort((first, second) =>
            Number(first.activeTasks) - Number(second.activeTasks) ||
            String(first.id).localeCompare(String(second.id))
        )[0];
}

// ================== SELLER REQUESTS ==================
export function getSellerReplacements(user) {
    const tasks = readList(TASK_KEY);

    return readList(REQUEST_KEY)
        .filter((request) => ownsRequest(request, user))
        .map((request) => ({
            ...request,
            pickupTask: findTask(
                tasks,
                request,
                "replacement_pickup"
            ),
            deliveryTask: findTask(
                tasks,
                request,
                "replacement_delivery"
            ),
        }))
        .sort((first, second) =>
            new Date(second.requestedAt) -
            new Date(first.requestedAt)
        );
}

export function getSellerReplacement(user, requestId) {
    return getSellerReplacements(user).find((request) =>
        String(request.id) === String(requestId)
    ) || null;
}

export function getReplacementStock(request) {
    const match = findProductVariant(
        request,
        getProducts()
    );

    if (match.error) {
        return {
            available: 0,
            reserved: 0,
            error: match.error,
        };
    }

    const reserved = Number(
        match.variant.reservedStock ??
        match.variant.reservedQuantity ??
        0
    ) || 0;

    return {
        sku: match.sku,
        onHand: Number(match.variant.stock || 0),
        reserved,
        available: availableQuantity(match.variant),
        error: "",
    };
}

// ================== SELLER CONFIRMATION ==================
export function respondToReplacement(user, requestId, decision, note) {
    const requests = readList(REQUEST_KEY);

    const request = requests.find((item) =>
        String(item.id) === String(requestId)
    );

    const comment = String(note || "").trim();

    if (
        !request ||
        !ownsRequest(request, user) ||
        request.status !== "Pending"
    ) {
        throw new Error(
            "This replacement request is not available for confirmation."
        );
    }

    if (!["Confirmed", "Declined"].includes(decision)) {
        throw new Error("Invalid seller decision.");
    }

    if (decision === "Declined" && comment.length < 5) {
        throw new Error(
            "Enter at least 5 characters explaining the issue."
        );
    }

    if (comment.length > 300) {
        throw new Error(
            "Seller note cannot exceed 300 characters."
        );
    }

    if (decision === "Confirmed") {
        const match = findProductVariant(
            request,
            getProducts()
        );

        if (
            match.error ||
            availableQuantity(match.variant) < Number(request.quantity)
        ) {
            throw new Error(
                match.error ||
                "Not enough available stock for this replacement."
            );
        }
    }

    const now = new Date().toISOString();

    const updated = requests.map((item) => {
        if (String(item.id) !== String(requestId)) {
            return item;
        }

        return {
            ...item,
            sellerDecision: decision,
            sellerNote: comment,
            sellerRespondedAt: now,
            history: [
                ...(item.history || []),
                {
                    status: `Seller ${decision}`,
                    note: comment ||
                        "Seller confirmed identical replacement stock.",
                    date: now,
                },
            ],
        };
    });

    saveList(REQUEST_KEY, updated);
}

// ================== STOCK RESERVATIONS ==================
function reserveApprovedStock(request, products) {
    const match = findProductVariant(
        request,
        products
    );

    if (match.error) {
        return { error: match.error };
    }

    if (
        availableQuantity(match.variant) <
        Number(request.quantity)
    ) {
        return {
            error: "Replacement stock is insufficient; restock this SKU first.",
        };
    }

    const reserved = Number(
        match.variant.reservedStock ??
        match.variant.reservedQuantity ??
        0
    ) || 0;

    match.variant.reservedStock = reserved +
        Number(request.quantity);

    if (match.variant.reservedQuantity != null) {
        match.variant.reservedQuantity =
            match.variant.reservedStock;
    }

    return {
        error: "",
        quantity: Number(request.quantity),
    };
}

// ================== WORKFLOW SYNCHRONIZATION ==================
export function syncSellerReplacementWorkflow(user) {
    const requests = readList(REQUEST_KEY);
    const tasks = readList(TASK_KEY);
    const products = structuredClone(getProducts());

    let requestsChanged = false;
    let productsChanged = false;

    // Apply the real quantity reservation after Admin approval.
    const nextRequests = requests.map((original) => {
        if (!ownsRequest(original, user)) {
            return original;
        }

        let request = { ...original };

        const needsReservation =
            activeStatuses.includes(request.status) &&
            request.stockReserved &&
            !request.stockReservationApplied &&
            !request.dispatchedAt;

        if (needsReservation) {
            const result = reserveApprovedStock(
                request,
                products
            );

            if (!result.error) {
                request.stockReservationApplied = true;
                request.stockReservationQuantity = result.quantity;
                request.stockWarning = "";

                productsChanged = true;
                requestsChanged = true;
            } else if (request.stockWarning !== result.error) {
                request.stockWarning = result.error;
                requestsChanged = true;
            }
        }

        const pickup = findTask(
            tasks,
            request,
            "replacement_pickup"
        );

        const delivery = findTask(
            tasks,
            request,
            "replacement_delivery"
        );

        if (
            request.status !== "Rejected" &&
            request.status !== "Completed"
        ) {
            let nextStatus = request.status;

            if (delivery?.stage === "delivered") {
                nextStatus = request.dispatchedAt
                    ? "Completed"
                    : request.status;
            } else if (delivery?.stage === "out_for_delivery") {
                nextStatus = "Out for Delivery";
            } else if (delivery) {
                nextStatus = "Replacement Ready";
            } else if (pickup?.stage === "delivered") {
                nextStatus = "Inspection";
            } else if (pickup?.stage === "picked_up") {
                nextStatus = "Picked Up";
            } else if (
                pickup?.agentId &&
                request.status === "Approved"
            ) {
                nextStatus = "Pickup Assigned";
            }

            if (nextStatus !== request.status) {
                request = appendEvent(
                    request,
                    nextStatus,
                    "Delivery task progress synchronized."
                );

                requestsChanged = true;
            }
        }

        return request;
    });

    // Save reservations with best-effort rollback.
    if (productsChanged || requestsChanged) {
        const previousProducts = localStorage.getItem(PRODUCT_KEY);
        const previousRequests = localStorage.getItem(REQUEST_KEY);

        try {
            if (productsChanged) {
                saveProducts(products);
            }

            if (requestsChanged) {
                saveList(REQUEST_KEY, nextRequests);
            }
        } catch (error) {
            if (previousProducts === null) {
                localStorage.removeItem(PRODUCT_KEY);
            } else {
                localStorage.setItem(
                    PRODUCT_KEY,
                    previousProducts
                );
            }

            if (previousRequests === null) {
                localStorage.removeItem(REQUEST_KEY);
            } else {
                localStorage.setItem(
                    REQUEST_KEY,
                    previousRequests
                );
            }

            throw error;
        }
    }

    // Deduct reserved replacement stock only after agent pickup.
    for (const request of getSellerReplacements(user)) {
        const stage = request.deliveryTask?.stage;

        const dispatched = [
            "picked_up",
            "out_for_delivery",
            "delivered",
        ].includes(stage);

        if (
            request.dispatchedAt ||
            !request.stockReservationApplied ||
            !dispatched
        ) {
            continue;
        }

        const match = findProductVariant(
            request,
            getProducts()
        );

        if (match.error) {
            continue;
        }

        const result = applyInventoryMovements(user, [{
            productId: request.productId,
            variantId: match.variantId,
            sku: match.sku,
            mode: "replacement_out",
            quantity: Number(request.quantity),
            releaseReserved: Number(request.quantity),
            reason: "Replacement parcel handed to delivery agent",
            reference: request.id,
            eventKey: `replacement-dispatch:${request.id}`,
        }]);

        if (result.updated || result.duplicates) {
            const now = new Date().toISOString();

            const updated = readList(REQUEST_KEY).map((item) =>
                String(item.id) === String(request.id)
                    ? {
                        ...item,
                        dispatchedAt: now,
                    }
                    : item
            );

            saveList(REQUEST_KEY, updated);
        }
    }

    // Only the agent's delivered stage completes the replacement.
    const finalRequests = readList(REQUEST_KEY);
    let completed = false;

    const synced = finalRequests.map((request) => {
        if (
            !ownsRequest(request, user) ||
            request.status === "Completed"
        ) {
            return request;
        }

        const delivery = findTask(
            tasks,
            request,
            "replacement_delivery"
        );

        if (
            delivery?.stage === "delivered" &&
            request.dispatchedAt
        ) {
            completed = true;

            return appendEvent(
                request,
                "Completed",
                "Replacement delivered by assigned agent."
            );
        }

        return request;
    });

    if (completed) {
        saveList(REQUEST_KEY, synced);
    }
}

// ================== RETURN INSPECTION ==================
export function inspectReturnedItem(
    user,
    requestId,
    condition,
    note,
    skuVerified
) {
    const request = getSellerReplacement(
        user,
        requestId
    );

    const comment = String(note || "").trim();

    if (
        !request ||
        request.status !== "Inspection" ||
        request.inspectedAt
    ) {
        throw new Error(
            "This replacement is not awaiting inspection."
        );
    }

    if (request.pickupTask?.stage !== "delivered") {
        throw new Error(
            "Wait for the delivery agent to return the original item."
        );
    }

    const conditions = [
        "Resellable",
        "Damaged / Defective",
        "Wrong Item",
    ];

    if (!conditions.includes(condition)) {
        throw new Error(
            "Select the received item's condition."
        );
    }

    if (
        comment.length < 5 ||
        comment.length > 300
    ) {
        throw new Error(
            "Enter inspection notes containing 5–300 characters."
        );
    }

    if (
        condition === "Resellable" &&
        !skuVerified
    ) {
        throw new Error(
            "Verify the returned item's original SKU before restocking."
        );
    }

    // Only verified resellable items return to available stock.
    if (condition === "Resellable") {
        const match = findProductVariant(
            request,
            getProducts()
        );

        if (match.error) {
            throw new Error(match.error);
        }

        const result = applyInventoryMovements(user, [{
            productId: request.productId,
            variantId: match.variantId,
            sku: match.sku,
            mode: "return",
            quantity: Number(request.quantity),
            reason: "Inspected original return: resellable",
            note: comment,
            reference: request.id,
            eventKey: `replacement-return:${request.id}`,
        }]);

        if (!result.updated && !result.duplicates) {
            throw new Error(
                result.errors[0] ||
                "Unable to record returned stock."
            );
        }
    }

    const now = new Date().toISOString();

    const updated = readList(REQUEST_KEY).map((item) =>
        String(item.id) === String(requestId)
            ? {
                ...item,
                returnCondition: condition,
                returnSkuVerified: Boolean(skuVerified),
                inspectionNote: comment,
                inspectedAt: now,
                history: [
                    ...(item.history || []),
                    {
                        status: "Inspected",
                        date: now,
                        note: `${condition}: ${comment}`,
                    },
                ],
            }
            : item
    );

    saveList(REQUEST_KEY, updated);
}

// ================== REPLACEMENT PACKING ==================
export function startReplacementPacking(user, requestId) {
    const request = getSellerReplacement(
        user,
        requestId
    );

    if (
        !request ||
        request.status !== "Inspection" ||
        !request.inspectedAt
    ) {
        throw new Error(
            "Inspect the returned item before packing a replacement."
        );
    }

    if (!request.stockReservationApplied) {
        throw new Error(
            request.stockWarning ||
            "Replacement stock is not reserved."
        );
    }

    if (request.packingAt) return;

    const now = new Date().toISOString();

    const updated = readList(REQUEST_KEY).map((item) =>
        String(item.id) === String(requestId)
            ? {
                ...item,
                packingAt: now,
                history: [
                    ...(item.history || []),
                    {
                        status: "Replacement Packing",
                        date: now,
                        note: "Seller started packing the identical replacement.",
                    },
                ],
            }
            : item
    );

    saveList(REQUEST_KEY, updated);
}

// ================== REPLACEMENT DELIVERY ==================
export function readyReplacementForPickup(
    user,
    requestId,
    note = ""
) {
    const request = getSellerReplacement(
        user,
        requestId
    );

    if (
        !request ||
        request.status !== "Inspection" ||
        !request.inspectedAt ||
        !request.packingAt ||
        !request.stockReservationApplied
    ) {
        throw new Error(
            "Complete return inspection and replacement packing first."
        );
    }

    if (request.deliveryTask) {
        throw new Error(
            "A delivery task already exists for this replacement."
        );
    }

    const match = findProductVariant(
        request,
        getProducts()
    );

    if (
        match.error ||
        Number(match.variant.stock || 0) <
        Number(request.quantity)
    ) {
        throw new Error(
            match.error ||
            "Replacement stock is no longer available."
        );
    }

    if (
        !request.sellerPincode ||
        !request.customerPincode
    ) {
        throw new Error(
            "Seller and customer pincodes are required for delivery."
        );
    }

    const now = new Date().toISOString();
    const taskId = `REP-DELIVERY-${request.id}`;

    const existingTasks = readList(TASK_KEY);

    if (
        existingTasks.some((task) =>
            String(task.id) === taskId
        )
    ) {
        throw new Error(
            "Replacement delivery task already exists."
        );
    }

    const task = {
        id: taskId,
        orderId: request.orderId,
        parcelId: `RDL-${request.id}`,
        replacementId: request.id,
        kind: "replacement_delivery",
        source: "Replacement",
        product: request.productName,
        seller: request.seller || getStoreName(user),
        pickupPincode: request.sellerPincode,
        deliveryPincode: request.customerPincode,
        stage: "ready_for_pickup",
        agentId: null,
        custody: "Seller",
        assignmentMode: null,
        attempts: 0,
        events: [],
        createdAt: now,
    };

    // Use the same location/capacity rules as Admin assignments.
    const agents = readList(AGENT_KEY);
    const agent = findAgent(task, agents);

    if (agent) {
        task.agentId = agent.id;
        task.stage = "assigned";
        task.assignmentMode = "Auto";
        task.assignedAt = now;

        task.events.push({
            date: now,
            note: `Automatically assigned to ${agent.name}.`,
        });
    }

    const updatedAgents = agents.map((item) =>
        item.id === agent?.id
            ? {
                ...item,
                activeTasks: Number(item.activeTasks) + 1,
            }
            : item
    );

    const updatedRequests = readList(REQUEST_KEY).map((item) =>
        String(item.id) === String(requestId)
            ? appendEvent({
                ...item,
                deliveryTaskId: task.id,
                packedAt: now,
                sellerDispatchNote: String(note || "")
                    .trim()
                    .slice(0, 200),
            }, "Replacement Ready", "New parcel ready for agent pickup.")
            : item
    );

    const previousTasks = localStorage.getItem(TASK_KEY);
    const previousRequests = localStorage.getItem(REQUEST_KEY);
    const previousAgents = localStorage.getItem(AGENT_KEY);

    try {
        saveList(
            TASK_KEY,
            [...existingTasks, task]
        );

        saveList(
            REQUEST_KEY,
            updatedRequests
        );

        if (agent) {
            saveList(AGENT_KEY, updatedAgents);
        }
    } catch (error) {
        if (previousTasks === null) {
            localStorage.removeItem(TASK_KEY);
        } else {
            localStorage.setItem(
                TASK_KEY,
                previousTasks
            );
        }

        if (previousRequests === null) {
            localStorage.removeItem(REQUEST_KEY);
        } else {
            localStorage.setItem(
                REQUEST_KEY,
                previousRequests
            );
        }

        if (previousAgents === null) {
            localStorage.removeItem(AGENT_KEY);
        } else {
            localStorage.setItem(
                AGENT_KEY,
                previousAgents
            );
        }

        throw error;
    }

    return task;
}

// ================== FRONTEND DEMO REQUEST ==================
export function createDemoReplacementRequest(
    user,
    variantKey,
    reason,
    description
) {
    const inventory = inventoryRows(user);

    const item = inventory.find((row) =>
        row.key === variantKey
    );

    const explanation = String(description || "").trim();

    if (!item || item.available < 2) {
        throw new Error(
            "Choose a seller-owned variant with at least 2 available units."
        );
    }

    if (
        !reason ||
        explanation.length < 10 ||
        explanation.length > 300
    ) {
        throw new Error(
            "Select a reason and provide a description of 10–300 characters."
        );
    }

    const product = ownProducts(user).find((record) =>
        record.id === item.productId
    );

    const category = getCategories().find((entry) =>
        entry.slug === product?.category
    );

    if (
        !category ||
        category.replacementAllowed !== true ||
        category.status !== "Active"
    ) {
        throw new Error(
            "Enable replacements for this subcategory in Admin Categories first."
        );
    }

    let profiles = {};

    try {
        profiles = JSON.parse(
            localStorage.getItem(STORE_KEY) || "{}"
        );
    } catch {
        // Use an empty profile.
    }

    const pickupPincode = String(
        profiles?.[sellerKey(user)]?.pincode || ""
    );

    if (!/^\d{6}$/.test(pickupPincode)) {
        throw new Error(
            "Add a valid pickup pincode in your Store Profile first."
        );
    }

    const suffix = crypto.randomUUID()
        .slice(0, 8)
        .toUpperCase();

    const orderId = `ZUP-DEMO-${suffix}`;
    const requestId = `ZR-DEMO-${suffix}`;

    const now = new Date();
    const deliveredAt = new Date(
        now.getTime() - 86400000
    ).toISOString();

    const createdAt = new Date(
        now.getTime() - 2 * 86400000
    ).toISOString();

    const existingOrders = readList(ORDER_KEY);
    const existingRequests = readList(REQUEST_KEY);

    const previous = [
        PRODUCT_KEY,
        "zupito_seller_stock_movements",
        ORDER_KEY,
        REQUEST_KEY,
    ].map((key) => [
        key,
        localStorage.getItem(key),
    ]);

    const demoOrder = {
        id: orderId,
        _id: orderId,
        createdAt,
        deliveredAt,
        customerName: "Demo Customer",
        address: {
            name: "Demo Customer",
            phone: "98******21",
            area: "Sample Street",
            city: "Bhubaneswar",
            state: "Odisha",
            pincode: "751001",
        },
        items: [{
            productId: item.productId,
            variantId: item.variantId,
            sku: item.sku,
            name: product.name,
            variant: item.variant,
            image: item.image,
            quantity: 1,
            price: item.price,
            sellerId: user.id,
            sellerEmail: user.email,
        }],
        totalAmount: item.price,
        orderStatus: "delivered",
        paymentStatus: "Paid (Demo)",
        demoPayment: true,
        paymentVerified: false,
        parcels: [{
            id: `PKG-${suffix}`,
            sellerId: user.id,
            sellerEmail: user.email,
            sellerName: getStoreName(user),
            status: "delivered",
            stockReserved: false,
            itemIndexes: [0],
        }],
        activity: [{
            type: "delivered",
            date: deliveredAt,
            note: "Demo delivered order for replacement workflow testing.",
        }],
    };

    const demoRequest = {
        id: requestId,
        orderId,
        productId: product.id,
        variantId: item.variantId === "base"
            ? null
            : item.variantId,
        productName: product.name,
        category: product.category,
        sellerId: user.id,
        sellerEmail: user.email,
        seller: getStoreName(user),
        customerName: "Demo Customer",
        customerPincode: "751001",
        sellerPincode: pickupPincode,
        quantity: 1,
        reason,
        description: explanation,
        deliveredAt,
        requestedAt: now.toISOString(),
        sellerDecision: "Awaiting",
        sellerNote: "",
        status: "Pending",
        demoRequest: true,
        history: [{
            status: "Pending",
            date: now.toISOString(),
            note: "Customer submitted a replacement (frontend demo).",
        }],
    };

    try {
        ensureStockHistory(user);

        // A demo delivered order is a simulated sale, not a restock.
        const result = applyInventoryMovements(user, [{
            productId: item.productId,
            variantId: item.variantId,
            sku: item.sku,
            mode: "sale",
            quantity: 1,
            reason: "Delivered demo order",
            reference: orderId,
            eventKey: `demo-sale:${orderId}`,
        }]);

        if (!result.updated) {
            throw new Error(
                result.errors[0] ||
                "Unable to record the demo sale."
            );
        }

        saveList(
            ORDER_KEY,
            [...existingOrders, demoOrder]
        );

        saveList(
            REQUEST_KEY,
            [...existingRequests, demoRequest]
        );
    } catch (error) {
        for (const [key, value] of previous) {
            if (value === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, value);
            }
        }

        throw error;
    }

    return requestId;
}
