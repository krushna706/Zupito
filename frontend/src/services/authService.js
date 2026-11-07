import api from "./api";

export const login = async (identifier, password) =>
    (await api.post("/auth/login", { identifier, password })).data.user;

export const register = async (form) =>
    (await api.post("/auth/signup", form)).data;

export const registerSeller = async (form) =>
    (await api.post("/auth/seller-register", form)).data;

export const getCurrentUser = async () =>
    (await api.get("/auth/me")).data.user;

export const logout = async () =>
    (await api.post("/auth/logout")).data;

export const requestPasswordReset = async (identifier) =>
    (await api.post("/auth/forgot-password/request", { identifier })).data;

export const verifyPasswordReset = async (requestId, otp) =>
    (await api.post("/auth/forgot-password/verify", { requestId, otp })).data;

export const resetPassword = async (
    resetToken,
    password,
    confirmPassword
) =>
    (
        await api.post("/auth/forgot-password/reset", {
            resetToken,
            password,
            confirmPassword,
        })
    ).data;

export function getLoginDestination(user, returnTo) {
    if (user.role === "seller" && user.seller?.status !== "Approved") {
        return "/manage/approval-status";
    }

    if (user.role !== "customer") {
        return "/manage/dashboard";
    }

    if (
        typeof returnTo === "string" &&
        /^\/(?:account(?:[/?#]|$)|checkout(?:[/?#]|$)|order-confirmation\/|products(?:[/?#]|$)|cart(?:[/?#]|$))/.test(
            returnTo
        )
    ) {
        return returnTo;
    }

    return "/";
}