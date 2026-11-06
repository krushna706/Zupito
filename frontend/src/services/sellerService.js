
import { productCatalog } from "../data/productCatalog";

// ================== CONFIGURATION ==================
const PRODUCT_KEY = "zupito_admin_products";
const CATEGORY_KEY = "zupito_admin_categories";
const SELLER_KEY = "zupito_admin_sellers";
const STORE_KEY = "zupito_seller_store_profiles";
const MOVEMENT_KEY = "zupito_seller_stock_movements";

const MAX_STOCK = 999999;

const sellerNames = {
    electronics: "TechNova Electronics",
    fashion: "Urban Fashion",
    grocery: "Fresh Basket",
    "personal-care": "GlowCare Store",
    "home-kitchen": "HomeCraft Living",
    travel: "TravelMate Store",
};

const pendingProducts = new Set([
    "preview-smartphone",
    "preview-dress",
    "preview-pantry",
    "preview-backpack",
]);

// ================== STORAGE HELPERS ==================
function readStorage(key, fallback) {
    try {
        const data = JSON.parse(localStorage.getItem(key));
        return data ?? fallback;
    } catch {
        return fallback;
    }
}

export function readRows(key) {
    const rows = readStorage(key, []);
    return Array.isArray(rows) ? rows : [];
}

export function sellerKey(user) {
    return String(user?.id || user?.email || "seller-demo").toLowerCase();
}

function isValidQuantity(value) {
    return /^(0|[1-9]\d*)$/.test(String(value)) &&
        Number.isSafeInteger(Number(value)) &&
        Number(value) <= MAX_STOCK;
}

// ================== PRODUCT MANAGEMENT ==================
export function getProducts() {
    const saved = readStorage(PRODUCT_KEY, null);

    if (Array.isArray(saved)) return saved;

    return productCatalog.map((product, index) => {
        let status = "Approved";

        if (pendingProducts.has(product._id)) {
            status = "Pending";
        } else if (product._id === "preview-watch") {
            status = "Rejected";
        } else if (product._id === "preview-headphones") {
            status = "Suspended";
        }

        return {
            ...product,
            id: product._id,
            productCode: `ZP${1001 + index}`,
            seller: sellerNames[product.group] || "Marketplace Seller",
            status,
            reviewType: ["preview-dress", "preview-backpack"].includes(product._id)
                ? "Content Update"
                : "New Listing",
            submittedAt: new Date(
                Date.UTC(2026, 9, 18 + index)
            ).toISOString(),
            reviewedAt: status === "Pending"
                ? null
                : "2026-11-03T10:00:00.000Z",
            moderationReason: status === "Rejected"
                ? "Product description needs additional information."
                : status === "Suspended"
                    ? "Listing temporarily restricted for review."
                    : "",
            history: [],
        };
    });
}

export function saveProducts(products) {
    localStorage.setItem(PRODUCT_KEY, JSON.stringify(products));
}

export function ownProducts(user) {
    return getProducts().filter((product) => {
        const sameId = user?.id &&
            String(product.sellerId) === String(user.id);

        const sameEmail = user?.email &&
            product.sellerEmail?.toLowerCase() === user.email.toLowerCase();

        return sameId || sameEmail;
    });
}

// ================== CATEGORY MANAGEMENT ==================
export function getCategories() {
    const saved = readStorage(CATEGORY_KEY, null);

    if (Array.isArray(saved)) return saved;

    const parentGroups = {
        "personal-care": "health-beauty",
        "home-kitchen": "home-living",
    };

    const groupNames = {
        electronics: "Electronics",
        fashion: "Fashion",
        grocery: "Groceries",
        "health-beauty": "Health & Beauty",
        "home-living": "Home & Living",
        travel: "Travel Essentials",
    };

    const groups = new Set();
    const categories = new Map();

    productCatalog.forEach((product) => {
        const group = parentGroups[product.group] || product.group;
        groups.add(group);

        if (!categories.has(product.category)) {
            categories.set(product.category, {
                slug: product.category,
                name: product.category
                    .replace(/-/g, " ")
                    .replace(/\b\w/g, (char) => char.toUpperCase()),
                parentId: group,
                status: "Active",
            });
        }
    });

    return [
        ...Array.from(groups, (slug) => ({
            slug,
            name: groupNames[slug] || slug,
            parentId: null,
            status: "Active",
        })),
        ...categories.values(),
    ];
}

// ================== SELLER DETAILS ==================
export function getStoreName(user) {
    const profiles = readStorage(STORE_KEY, {});
    const saved = profiles?.[sellerKey(user)];

    if (saved?.storeName) return saved.storeName;

    const seller = readRows(SELLER_KEY).find((item) =>
        user?.email &&
        item.email?.toLowerCase() === user.email.toLowerCase()
    );

    return seller?.storeName || "Zupito Seller Store";
}

// ================== PRODUCT HELPERS ==================
export function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

export function productStock(product) {
    if (Array.isArray(product.variants) && product.variants.length) {
        return product.variants.reduce(
            (total, variant) => total + Number(variant.stock || 0),
            0
        );
    }

    return Number(product.stock || 0);
}

// ================== INVENTORY HELPERS ==================
export function inventoryRows(user) {
    return ownProducts(user).flatMap((product) => {
        const hasVariants = Array.isArray(product.variants) &&
            product.variants.length > 0;

        const variants = hasVariants ? product.variants : [product];

        return variants.map((variant, index) => {
            const onHand = Number(variant.stock || 0);

            const reserved = Math.max(
                0,
                Number(
                    variant.reservedStock ??
                    variant.reservedQuantity ??
                    0
                ) || 0
            );

            const variantId = hasVariants
                ? String(variant.id ?? index)
                : "base";

            return {
                key: `${product.id}::${variantId}`,
                productId: product.id,
                variantId,
                name: product.name,
                productCode: product.productCode,
                image: variant.image || product.image,
                brand: product.brand,
                sku: String(
                    variant.sku || product.productCode || product.id
                ).toUpperCase(),
                variant: variant.variantLabel ||
                    variant.options?.variant ||
                    "Standard",
                price: Number(variant.price ?? product.price) || 0,
                onHand,
                reserved,
                available: Math.max(0, onHand - reserved),
                approval: product.status || "Pending",
            };
        });
    });
}

export function getStockMovements(user) {
    return readRows(MOVEMENT_KEY)
        .filter((item) => item.owner === sellerKey(user))
        .sort((a, b) => b.date.localeCompare(a.date));
}

function findVariant(product, variantId) {
    if (variantId === "base") {
        return product.variants?.length ? null : product;
    }

    return product.variants?.find((variant, index) =>
        String(variant.id ?? index) === String(variantId)
    );
}

function updateProductStock(product) {
    if (product.variants?.length) {
        product.stock = productStock(product);
    }

    product.updatedAt = new Date().toISOString();
}

// ================== STOCK HISTORY ==================
function createMovement(user, row, before, after, details) {
    return {
        id: crypto.randomUUID(),
        owner: sellerKey(user),
        productId: row.productId,
        productName: row.name,
        variantId: row.variantId,
        sku: row.sku,
        variant: row.variant,
        type: details.type,
        before,
        change: after - before,
        after,
        reason: details.reason,
        note: details.note || "",
        reference: details.reference || "",
        eventKey: details.eventKey || "",
        actor: user?.name || "Seller",
        date: new Date().toISOString(),
    };
}

export function ensureStockHistory(user) {
    const history = readRows(MOVEMENT_KEY);
    const owner = sellerKey(user);

    const existing = new Set(
        history.map((entry) =>
            `${entry.owner}|${entry.productId}|${entry.variantId}`
        )
    );

    const movements = inventoryRows(user)
        .filter((row) =>
            !existing.has(`${owner}|${row.productId}|${row.variantId}`)
        )
        .map((row) => createMovement(user, row, 0, row.onHand, {
            type: "Opening",
            reason: "Opening balance when tracking started",
        }));

    if (movements.length) {
        localStorage.setItem(
            MOVEMENT_KEY,
            JSON.stringify([...history, ...movements])
        );
    }

    return movements.length;
}

// Save product updates and stock history with rollback on storage errors.
function persistInventory(products, movements) {
    if (!movements.length) return;

    const previousProducts = localStorage.getItem(PRODUCT_KEY);
    const previousHistory = localStorage.getItem(MOVEMENT_KEY);
    const history = readRows(MOVEMENT_KEY);

    try {
        saveProducts(products);

        localStorage.setItem(
            MOVEMENT_KEY,
            JSON.stringify([...history, ...movements])
        );
    } catch (error) {
        try {
            if (previousProducts === null) {
                localStorage.removeItem(PRODUCT_KEY);
            } else {
                localStorage.setItem(PRODUCT_KEY, previousProducts);
            }

            if (previousHistory === null) {
                localStorage.removeItem(MOVEMENT_KEY);
            } else {
                localStorage.setItem(MOVEMENT_KEY, previousHistory);
            }
        } catch {
            // Browser storage does not support transactions.
        }

        throw error;
    }
}

// ================== STOCK UPDATES ==================
export function applyInventoryMovements(user, updates) {
    ensureStockHistory(user);

    const products = structuredClone(getProducts());
    const history = readRows(MOVEMENT_KEY);

    const allowedIds = new Set(
        ownProducts(user).map((product) => String(product.id))
    );

    const movements = [];

    const result = {
        updated: 0,
        unchanged: 0,
        duplicates: 0,
        errors: [],
    };

    const movementTypes = {
        add: "Restock",
        set: "Adjustment",
        remove: "Damage/Loss",
        sale: "Sale",
        return: "Return",
        replacement_out: "Replacement Dispatch",
    };

    updates.forEach((change) => {
        const product = products.find((item) =>
            String(item.id) === String(change.productId)
        );

        if (!product || !allowedIds.has(String(change.productId))) {
            result.errors.push(`${change.sku}: Product not found.`);
            return;
        }

        const variant = findVariant(product, change.variantId);

        const actualSku = String(
            variant?.sku || product.productCode || product.id
        ).toUpperCase();

        if (!variant || actualSku !== change.sku) {
            result.errors.push(`${change.sku}: Variant or SKU changed.`);
            return;
        }

        if (!movementTypes[change.mode]) {
            result.errors.push(`${change.sku}: Invalid movement type.`);
            return;
        }

        if (change.eventKey && [...history, ...movements].some(
            (entry) => entry.eventKey === change.eventKey
        )) {
            result.duplicates++;
            return;
        }

        if (!isValidQuantity(change.quantity)) {
            result.errors.push(`${change.sku}: Invalid quantity.`);
            return;
        }

        const quantity = Number(change.quantity);
        const before = Number(variant.stock || 0);

        const reserved = Math.max(
            0,
            Number(
                variant.reservedStock ??
                variant.reservedQuantity ??
                0
            ) || 0
        );

        const release = ["sale", "replacement_out"].includes(change.mode)
            ? Number(change.releaseReserved || 0)
            : 0;

        if (
            !Number.isSafeInteger(release) ||
            release < 0 ||
            release > reserved ||
            (change.mode === "sale" && release > quantity)
            (change.mode === "replacement_out" && release !== quantity)
        ) {
            result.errors.push(`${change.sku}: Invalid reservation release.`);
            return;
        }

        let after = before;

        if (["add", "return"].includes(change.mode)) {
            after += quantity;
        } else if (["remove", "sale"].includes(change.mode)) {
            after -= quantity;
        } else {
            after = quantity;
        }

        if (
            !Number.isSafeInteger(after) ||
            after < reserved - release ||
            after > MAX_STOCK
        ) {
            result.errors.push(
                `${change.sku}: Quantity conflicts with reserved stock or stock limits.`
            );
            return;
        }

        if (change.mode !== "set" && quantity === 0) {
            result.errors.push(`${change.sku}: Quantity must be greater than zero.`);
            return;
        }

        if (after === before) {
            result.unchanged++;
            return;
        }

        if (!change.reason?.trim()) {
            result.errors.push(`${change.sku}: Movement reason required.`);
            return;
        }

        const row = {
            productId: product.id,
            variantId: change.variantId,
            name: product.name,
            sku: change.sku,
            variant: variant.variantLabel ||
                variant.options?.variant ||
                "Standard",
        };

        variant.stock = after;

        if (release > 0) {
            if (variant.reservedStock != null) {
                variant.reservedStock = reserved - release;
            }

            if (variant.reservedQuantity != null) {
                variant.reservedQuantity = reserved - release;
            }
        }

        updateProductStock(product);

        movements.push(createMovement(user, row, before, after, {
            type: movementTypes[change.mode],
            reason: change.reason.trim(),
            note: change.note?.trim(),
            reference: change.reference,
            eventKey: change.eventKey,
        }));

        result.updated++;
    });

    persistInventory(products, movements);

    return result;
}

// ================== PRODUCT STOCK HISTORY ==================
export function saveSellerProduct(user, updated, reason = "", note = "") {
    ensureStockHistory(user);

    const products = getProducts();
    const previous = products.find((item) => item.id === updated.id);

    if (
        previous &&
        !ownProducts(user).some((item) => item.id === previous.id)
    ) {
        throw new Error("This product does not belong to your seller account.");
    }

    const previousVariants = previous?.variants || [];
    const movements = [];

    // Prevent removing a variant that still has stock.
    for (const variant of previousVariants) {
        const stillExists = updated.variants.some((item) =>
            String(item.id) === String(variant.id)
        );

        const reserved = Number(
            variant.reservedStock ??
            variant.reservedQuantity ??
            0
        );

        if (!stillExists && (Number(variant.stock || 0) > 0 || reserved > 0)) {
            throw new Error(
                "Set an existing variant's stock to zero before removing it."
            );
        }
    }

    for (const variant of updated.variants) {
        const old = previousVariants.find((item) =>
            String(item.id) === String(variant.id)
        );

        const before = Number(old?.stock || 0);
        const after = Number(variant.stock || 0);

        const reserved = Number(
            old?.reservedStock ??
            old?.reservedQuantity ??
            0
        );

        if (!isValidQuantity(after) || after < reserved) {
            throw new Error(`${variant.sku}: Invalid stock quantity.`);
        }

        // Keep reserved quantities while editing the product.
        if (old) {
            if (old.reservedStock != null) {
                variant.reservedStock = old.reservedStock;
            }

            if (old.reservedQuantity != null) {
                variant.reservedQuantity = old.reservedQuantity;
            }
        }

        if (old && before === after) continue;

        if (old && !reason) {
            throw new Error("Select a reason for stock changes.");
        }

        if (old && reason === "Restock" && after < before) {
            throw new Error(
                "Restock cannot decrease stock. Use Adjustment or Damage/Loss."
            );
        }

        if (old && reason === "Damage/Loss" && after > before) {
            throw new Error("Damage/Loss cannot increase stock.");
        }

        if (old && reason !== "Restock" && !note.trim()) {
            throw new Error("Explain the manual stock correction.");
        }

        const row = {
            productId: updated.id,
            variantId: String(variant.id),
            name: updated.name,
            sku: variant.sku,
            variant: variant.variantLabel ||
                variant.options?.variant ||
                "Standard",
        };

        movements.push(createMovement(user, row, before, after, {
            type: old ? reason : "Opening",
            reason: old
                ? `${reason} from Product Form`
                : "Initial quantity from new variant",
            note: old ? note : "",
        }));
    }

    const next = previous
        ? products.map((item) => item.id === updated.id ? updated : item)
        : [...products, updated];

    const previousProducts = localStorage.getItem(PRODUCT_KEY);
    const previousHistory = localStorage.getItem(MOVEMENT_KEY);

    try {
        saveProducts(next);

        localStorage.setItem(
            MOVEMENT_KEY,
            JSON.stringify([...readRows(MOVEMENT_KEY), ...movements])
        );
    } catch (error) {
        try {
            if (previousProducts === null) {
                localStorage.removeItem(PRODUCT_KEY);
            } else {
                localStorage.setItem(PRODUCT_KEY, previousProducts);
            }

            if (previousHistory === null) {
                localStorage.removeItem(MOVEMENT_KEY);
            } else {
                localStorage.setItem(MOVEMENT_KEY, previousHistory);
            }
        } catch {
            // Browser storage does not support transactions.
        }

        throw error;
    }
}

// ================== IMAGE PROCESSING ==================
export function compressImage(file) {
    return new Promise((resolve, reject) => {
        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (
            !allowedTypes.includes(file.type) ||
            file.size > 3 * 1024 * 1024
        ) {
            reject(new Error("Use JPG, PNG or WebP up to 3 MB per image."));
            return;
        }

        const reader = new FileReader();

        reader.onerror = () => {
            reject(new Error("Could not read this image."));
        };

        reader.onload = () => {
            const image = new Image();

            image.onerror = () => {
                reject(new Error("Invalid product image."));
            };

            image.onload = () => {
                try {
                    const scale = Math.min(
                        1,
                        850 / Math.max(image.width, image.height)
                    );

                    const canvas = document.createElement("canvas");

                    canvas.width = Math.max(
                        1,
                        Math.round(image.width * scale)
                    );

                    canvas.height = Math.max(
                        1,
                        Math.round(image.height * scale)
                    );

                    const context = canvas.getContext("2d");

                    if (!context) {
                        throw new Error("Image processing unavailable.");
                    }

                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    const result = canvas.toDataURL("image/webp", 0.7);

                    if (result.length > 360000) {
                        throw new Error(
                            "Image is too large for browser preview storage."
                        );
                    }

                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            image.src = String(reader.result);
        };

        reader.readAsDataURL(file);
    });
}
