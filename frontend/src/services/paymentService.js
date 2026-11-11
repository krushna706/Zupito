import api from "./api";

export const quoteCheckout = async (addressId, couponCode) =>
    (
        await api.post("/checkout/quote", {
            addressId,
            couponCode,
        })
    ).data;

export const startCheckout = async (values) =>
    (
        await api.post("/checkout", values, {
            timeout: 45000,
        })
    ).data;

export async function getActiveCheckout(accountId) {
    let attemptId;

    try {
        attemptId = JSON.parse(
            sessionStorage.getItem(`zupito:checkout-attempt:${accountId}`) || "null"
        )?.attemptId;
    } catch {
        // The backend can still recover an active checkout.
    }

    return (
        await api.get("/checkout/active", {
            params: { attemptId },
        })
    ).data;
}

export function forgetCheckoutAttempt(accountId) {
    try {
        sessionStorage.removeItem(`zupito:checkout-attempt:${accountId}`);
    } catch {
        // Orders remain available from the backend.
    }
}

export const getPaymentStatus = async (id) =>
    (await api.get(`/payments/${encodeURIComponent(id)}`, { timeout: 45000 })).data;

let scriptPromise;

function loadRazorpay() {
    if (window.Razorpay) {
        return Promise.resolve();
    }

    if (scriptPromise) return scriptPromise;

    scriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");

        const fail = () => {
            clearTimeout(timer);
            script.remove();
            scriptPromise = null;

            reject(new Error("Unable to load Razorpay. Please retry."));
        };

        const timer = setTimeout(fail, 15000);

        script.src = "https://checkout.razorpay.com/v1/checkout.js";

        script.onload = () => {
            clearTimeout(timer);
            window.Razorpay ? resolve() : fail();
        };

        script.onerror = fail;

        document.head.appendChild(script);
    });

    return scriptPromise;
}

export async function openPayment(data) {
    if (!data.checkout) return;

    await loadRazorpay();

    return new Promise((resolve, reject) => {
        let verifying = false;

        const checkout = new window.Razorpay({
            ...data.checkout,

            handler: async (response) => {
                verifying = true;

                try {
                    await api.post(`/payments/${data.order.orderId}/verify`, response, {
                        timeout: 45000,
                    });
                } catch {
                    // Status page and backend worker recover uncertain results.
                }

                resolve();
            },

            modal: {
                ondismiss: () => {
                    if (!verifying) resolve();
                },
            },
        });

        try {
            checkout.open();
        } catch {
            reject(new Error("Unable to open payment. You can resume this checkout."));
        }
    });
}

export function getCheckoutAttempt(accountId, quoteToken) {
    const key = `zupito:checkout-attempt:${accountId}`;

    try {
        const saved = JSON.parse(sessionStorage.getItem(key) || "null");

        if (saved?.quoteToken === quoteToken) {
            return saved.attemptId;
        }
    } catch {
        // A server-side active checkout also prevents duplicates.
    }

    const attemptId = crypto.randomUUID();

    try {
        sessionStorage.setItem(key, JSON.stringify({ quoteToken, attemptId }));
    } catch {
        // Continue with this attempt in memory.
    }

    return attemptId;
}
