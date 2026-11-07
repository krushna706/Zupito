import api from "./api";

// Categories
export const getCategories = async (params, signal) =>
    (await api.get("/categories", { params, signal })).data;

export const createCategory = async (values) =>
    (await api.post("/categories", values)).data;

export const updateCategory = async (categoryId, values) =>
    (await api.patch(`/categories/${categoryId}`, values)).data;

export const updateCategoryStatus = async (categoryId, values) =>
    (await api.patch(`/categories/${categoryId}/status`, values)).data;

// Sellers
export const getSellers = async (params, signal) =>
    (await api.get("/admin/sellers", { params, signal })).data;

export const updateSellerStatus = async (sellerId, values) =>
    (await api.patch(`/admin/sellers/${sellerId}/status`, values)).data;