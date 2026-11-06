
import { productCatalog } from "../data/productCatalog";

// ================== SELLER CONFIGURATION ==================
const PRODUCT_KEY = "zupito_admin_products";
const CATEGORY_KEY = "zupito_admin_categories";
const STORE_KEY = "zupito_seller_store_profiles";

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
export function readRows(key) {
    try {
        const data = JSON.parse(localStorage.getItem(key) || "null");
        return Array.isArray(data) ? data : null;
    } catch {
        return null;
    }
}

// ================== PRODUCT MANAGEMENT ==================
export function getProducts() {
    const saved = readRows(PRODUCT_KEY);

    if (saved) return saved;

    return productCatalog.map((product, index) => {
        const status = pendingProducts.has(product._id)
            ? "Pending"
            : product._id === "preview-watch"
                ? "Rejected"
                : product._id === "preview-headphones"
                    ? "Suspended"
                    : "Approved";

        return {
            ...product,
            id: product._id,
            productCode: `ZP${1001 + index}`,
            seller: sellerNames[product.group] || "Marketplace Seller",
            status,
            reviewType: ["preview-dress", "preview-backpack"].includes(product._id)
                ? "Content Update"
                : "New Listing",
            submittedAt: new Date(Date.UTC(2026, 9, 18 + index)).toISOString(),
            reviewedAt: status === "Pending" ? null : "2026-11-03T10:00:00.000Z",
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
    return getProducts().filter((product) =>
        (user?.id && product.sellerId === user.id) ||
        (
            user?.email &&
            product.sellerEmail?.toLowerCase() === user.email.toLowerCase()
        )
    );
}

// ================== CATEGORY MANAGEMENT ==================
export function getCategories() {
    const saved = readRows(CATEGORY_KEY);

    if (saved) return saved;

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

    const categoryNames = {
        "mens-wear": "Men's Wear",
        "womens-wear": "Women's Wear",
        "kids-wear": "Kids' Wear",
        "personal-care": "Personal Care",
        "daily-essentials": "Daily Essentials",
        "snacks-drinks": "Snacks & Drinks",
        "home-kitchen": "Home & Kitchen",
        "trolley-bags": "Trolley Bags",
        "travel-accessories": "Travel Accessories",
    };

    const groups = new Set();
    const categories = new Map();

    productCatalog.forEach((product) => {
        const group = parentGroups[product.group] || product.group;
        groups.add(group);

        if (!categories.has(product.category)) {
            categories.set(product.category, {
                slug: product.category,
                name: categoryNames[product.category] ||
                    product.category
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

// ================== STORE DETAILS ==================
export function getStoreName(user) {
    try {
        const profiles = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
        const key = String(user?.id || user?.email || "seller-demo").toLowerCase();

        if (profiles?.[key]?.storeName) {
            return profiles[key].storeName;
        }
    } catch {
        // Continue with the demo store name.
    }

    const sellers = readRows("zupito_admin_sellers") || [];

    const seller = sellers.find((item) =>
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

// ================== IMAGE PROCESSING ==================
export function compressImage(file) {
    return new Promise((resolve, reject) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type) || file.size > 3 * 1024 * 1024) {
            reject(new Error("Use JPG, PNG or WebP up to 3 MB per image."));
            return;
        }

        const reader = new FileReader();

        reader.onerror = () => {
            reject(new Error("Could not read the selected image."));
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
                        throw new Error("Image processing is unavailable.");
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
