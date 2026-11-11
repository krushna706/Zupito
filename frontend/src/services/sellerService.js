import api from "./api";

// ================== DISPLAY AMOUNTS ==================
export function formatMoney(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

// Store profile
export const getStoreProfile = async (signal) =>
    (await api.get("/seller/store", { signal })).data.store;

export async function updateStoreProfile(values, logoFile) {
    const form = new FormData();

    Object.entries(values).forEach(([key, value]) => {
        form.append(key, String(value));
    });

    if (logoFile) {
        form.append("logo", logoFile);
    }

    return (
        await api.patch("/seller/store", form, {
            timeout: 90000,
        })
    ).data;
}

// Product API
export const fetchProductCategories = async (signal) =>
    (await api.get("/seller/product-categories", { signal })).data.categories;

export const fetchSellerProducts = async (params, signal) =>
    (await api.get("/seller/products", { params, signal })).data;

export const fetchSellerProduct = async (productId, signal) =>
    (await api.get(`/seller/products/${productId}`, { signal })).data.product;

export async function submitSellerProduct(productId, values, images) {
    const form = new FormData();
    const files = [];

    const imageKeys = images.map((image) => {
        if (!image.file) return image.publicId;

        const key = `upload:${files.length}`;
        files.push(image.file);
        return key;
    });

    form.append("data", JSON.stringify({ ...values, imageKeys }));

    files.forEach((file) => form.append("images", file));

    const config = { timeout: 240000 };

    return productId
        ? (await api.patch(`/seller/products/${productId}`, form, config)).data
        : (await api.post("/seller/products", form, config)).data;
}

// Inventory API
export const fetchInventory = async (params, signal) =>
    (await api.get("/seller/inventory", { params, signal })).data;

export const fetchInventoryHistory = async (params, signal) =>
    (await api.get("/seller/inventory/history", { params, signal })).data;

export const changeInventoryStock = async (values) =>
    (await api.post("/seller/inventory/movements", values)).data;

export async function importInventoryStock(file, values, catalog = false) {
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.append(key, value));
    form.append("file", file);
    let result = (
        await api.post(
            catalog ? "/seller/inventory/catalog-import" : "/seller/inventory/import",
            form
        )
    ).data;
    for (let attempt = 0; result.status !== "Completed" && attempt < 150; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        result = (await api.get(`/seller/inventory/imports/${result.id}`)).data;
    }
    if (result.status !== "Completed")
        throw new Error(
            "Import is still queued. Retry with the same reference to retrieve its progress."
        );
    return result;
}
