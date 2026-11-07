import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    withCredentials: true,
    timeout: 15000,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const message =
            error.response?.data?.message ||
            (error.code === "ECONNABORTED"
                ? "The request timed out. Please try again."
                : "Unable to connect to the server. Please check your connection.");

        const failure = new Error(message);

        failure.status = error.response?.status;
        failure.retryAfter = Number(
            error.response?.headers?.["retry-after"] ||
                error.response?.data?.retryAfter ||
                0
        );

        return Promise.reject(failure);
    }
);

export default api;