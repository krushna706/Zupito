import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import api from "./api";

// ================== CUSTOMER ORDERS ==================
export async function getCustomerOrders() {
    const orders = [];

    for (let page = 1; ; page += 1) {
        const { data } = await api.get("/orders", {
            params: { page },
        });

        orders.push(...data.orders);

        if (!data.hasMore) return orders;
    }
}

export async function getCustomerOrder(id) {
    const { data } = await api.get(`/orders/${encodeURIComponent(id)}`);

    return data.order;
}

// ================== STAFF ORDERS ==================
export async function getManagedOrders() {
    const orders = [];

    for (let page = 1; ; page += 1) {
        const { data } = await api.get("/orders/manage", {
            params: { page },
        });

        orders.push(...data.orders);

        if (!data.hasMore) return orders;
    }
}

export async function getManagedOrder(orderId, parcelId) {
    const path = `/orders/manage/${encodeURIComponent(orderId)}`;

    const { data } = await api.get(
        parcelId ? `${path}/parcels/${encodeURIComponent(parcelId)}` : path
    );

    return data.order;
}

export async function advanceSellerParcel(orderId, parcelId, stage, note = "") {
    const status = {
        packing: "Packing",
        ready_for_pickup: "Ready for Pickup",
    }[stage];

    if (!status) {
        throw new Error("Invalid order action.");
    }

    const { data } = await api.patch(
        `/orders/manage/${encodeURIComponent(orderId)}/parcels/${encodeURIComponent(parcelId)}`,
        { status, note }
    );

    window.dispatchEvent(new Event("zupito:orders-updated"));

    return data.order;
}

// ================== ORDER REFRESH ==================
export function useOrderResource(kind, orderId = "", parcelId = "") {
    const { user } = useAuth();
    const accountId = user?._id || user?.id || "";

    const [state, setState] = useState({
        data: null,
        loading: true,
        error: "",
    });

    const refreshRef = useRef(() => {});
    const refresh = useCallback(() => refreshRef.current(), []);

    useEffect(() => {
        let active = true;
        let busy = false;
        let queued = false;

        setState({
            data: null,
            loading: true,
            error: "",
        });

        const load = async () => {
            if (!active) return;

            if (busy) {
                queued = true;
                return;
            }

            busy = true;

            try {
                const data =
                    kind === "customer-list"
                        ? await getCustomerOrders()
                        : kind === "customer-detail"
                          ? await getCustomerOrder(orderId)
                          : kind === "staff-list"
                            ? await getManagedOrders()
                            : await getManagedOrder(orderId, parcelId);

                if (active) {
                    setState({
                        data,
                        loading: false,
                        error: "",
                    });
                }
            } catch (failure) {
                if (active) {
                    setState((previous) => ({
                        ...previous,
                        loading: false,
                        error: failure.message,
                    }));
                }
            } finally {
                busy = false;

                if (queued && active) {
                    queued = false;
                    load();
                }
            }
        };

        const sync = () => {
            if (document.visibilityState === "visible") {
                load();
            }
        };

        refreshRef.current = load;
        load();

        const timer = window.setInterval(sync, 30000);

        window.addEventListener("focus", sync);
        window.addEventListener("zupito:orders-updated", sync);

        return () => {
            active = false;
            window.clearInterval(timer);
            window.removeEventListener("focus", sync);
            window.removeEventListener("zupito:orders-updated", sync);
        };
    }, [kind, orderId, parcelId, accountId]);

    return {
        ...state,
        refresh,
    };
}
