import api from "./api";

// Categories
export const getCategories = async (params, signal) =>
    (await api.get("/categories", { params, signal })).data;

export const createCategory = async (values) => (await api.post("/categories", values)).data;

export const updateCategory = async (categoryId, values) =>
    (await api.patch(`/categories/${categoryId}`, values)).data;

export const updateCategoryStatus = async (categoryId, values) =>
    (await api.patch(`/categories/${categoryId}/status`, values)).data;

// Sellers
export const getSellers = async (params, signal) =>
    (await api.get("/admin/sellers", { params, signal })).data;

export const updateSellerStatus = async (sellerId, values) =>
    (await api.patch(`/admin/sellers/${sellerId}/status`, values)).data;

export const getAdminProducts = async (params) =>
    (await api.get("/admin/products", { params })).data;

export const getAdminProduct = async (productId) =>
    (await api.get(`/admin/products/${productId}`)).data.product;

export const updateProductStatus = async (productId, values) =>
    (await api.patch(`/admin/products/${productId}/status`, values)).data;

export const bulkProductStatus = async (values) =>
    (await api.post("/admin/products/bulk-status", values)).data;
