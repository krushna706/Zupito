import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState
} from "react";
import { toast } from "react-toastify";

import { useAuth } from "./AuthContext";
import {
    cartReferences,
    getSavedCart,
    isGuestCartEvent,
    quoteCart,
    readGuestCart,
    saveCart,
    writeGuestCart
} from "../services/cartService";

const CartContext = createContext(null);

const emptyCart = {
    items: [],
    cartCount: 0,
    subtotal: 0,
    discount: 0,
    canCheckout: false
};

function CartSession({ accountId, children }) {
    const [cart, setCart] = useState(emptyCart);
    const [loading, setLoading] = useState(true);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState("");

    const current = useRef(emptyCart);
    const busy = useRef(true);
    const mounted = useRef(false);
    const guestMemory = useRef(readGuestCart());
    const mergePending = useRef(true);

    const applyCart = useCallback((next) => {
        current.current = next;
        setCart(next);
        setReady(true);
        setError("");
    }, []);

    const readCart = useCallback(async (isActive) => {
        let next = accountId
            ? await getSavedCart()
            : await quoteCart(guestMemory.current);

        if (!isActive()) return null;

        if (
            mergePending.current &&
            accountId &&
            guestMemory.current.length
        ) {
            const guest = await quoteCart(guestMemory.current);

            if (!isActive()) return null;

            const merged = new Map(
                cartReferences(next.items).map((item) => [
                    `${item.productId}::${item.variantId}`,
                    item
                ])
            );

            const remaining = [];
            let adjusted = false;

            for (const item of guest.items) {
                const existing = merged.get(item.product._id);

                if (
                    !item.product.availableForPurchase ||
                    (!existing && merged.size >= 50)
                ) {
                    remaining.push(...cartReferences([item]));
                    continue;
                }

                if (item.quantity > item.product.stock) {
                    adjusted = true;
                }

                merged.set(item.product._id, {
                    productId: item.product.productId,
                    variantId: item.product.variantId,
                    quantity: Math.max(
                        existing?.quantity || 0,
                        Math.min(item.quantity, item.product.stock)
                    )
                });
            }

            next = await saveCart(
                [...merged.values()],
                next.version
            );

            if (!isActive()) return null;

            guestMemory.current = remaining;

            if (!writeGuestCart(remaining)) {
                toast.warning(
                    "Unable to clear your browser cart after sign-in."
                );
            }

            if (adjusted) {
                toast.info(
                    "Some guest quantities were reduced to match available stock."
                );
            }

            if (remaining.length) {
                toast.info(
                    "Some guest items could not be moved to your account cart because they are unavailable or the cart is full."
                );
            }
        }

        mergePending.current = false;
        return next;
    }, [accountId]);

    useEffect(() => {
        let active = true;

        mounted.current = true;
        busy.current = true;

        async function load() {
            try {
                const next = await readCart(() => active);

                if (!active || !next) return;

                applyCart(next);
            } catch (failure) {
                if (active) setError(failure.message);
            } finally {
                if (active) {
                    busy.current = false;
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            active = false;
            mounted.current = false;
        };
    }, [readCart, applyCart]);

    const refreshCart = useCallback(async () => {
        if (busy.current) return null;

        busy.current = true;
        setLoading(true);

        try {
            const next = await readCart(
                () => mounted.current
            );

            if (!mounted.current || !next) return null;

            applyCart(next);
            return next;
        } catch (failure) {
            if (mounted.current) {
                setError(failure.message);
            }

            return null;
        } finally {
            if (mounted.current) {
                busy.current = false;
                setLoading(false);
            }
        }
    }, [readCart, applyCart]);

    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible") {
                refreshCart();
            }
        };

        const storage = (event) => {
            if (!accountId && isGuestCartEvent(event)) {
                guestMemory.current = readGuestCart();
                refreshCart();
            }
        };

        window.addEventListener("focus", refresh);
        window.addEventListener("storage", storage);
        document.addEventListener("visibilitychange", refresh);

        return () => {
            window.removeEventListener("focus", refresh);
            window.removeEventListener("storage", storage);
            document.removeEventListener(
                "visibilitychange",
                refresh
            );
        };
    }, [accountId, refreshCart]);

    const changeQuantity = async (product, change) => {
        if (!Number.isInteger(change) || !change) return;

        if (busy.current) {
            toast.info(
                "Please wait for your cart to finish updating."
            );
            return;
        }

        if (!ready) {
            toast.error(
                "Your cart could not be loaded. Open Cart and retry."
            );
            return;
        }

        const previous = current.current;

        const existing = previous.items.find(
            (item) => item.product._id === product._id
        );

        const quantity = Math.max(
            0,
            (existing?.quantity || 0) + change
        );

        if (quantity > 99) {
            toast.error("Maximum 99 units per variant.");
            return;
        }

        const references = cartReferences(previous.items)
            .map((item) =>
                `${item.productId}::${item.variantId}` === product._id
                    ? { ...item, quantity }
                    : item
            )
            .filter((item) => item.quantity > 0);

        if (!existing && quantity) {
            references.push({
                productId: product.productId,
                variantId: product.variantId,
                quantity
            });
        }

        if (references.length > 50) {
            toast.error(
                "Maximum 50 different variants per cart."
            );
            return;
        }

        busy.current = true;
        setLoading(true);

        try {
            const next = accountId
                ? await saveCart(references, previous.version)
                : await quoteCart(references);

            if (!mounted.current) return;

            if (!accountId) {
                const changed = next.items.find(
                    (item) => item.product._id === product._id
                );

                if (
                    change > 0 &&
                    changed &&
                    !changed.available
                ) {
                    throw new Error(
                        changed.product.issue ||
                            "This item is unavailable."
                    );
                }

                guestMemory.current = references;

                if (!writeGuestCart(references)) {
                    toast.warning(
                        "Browser storage is unavailable. Your cart may not survive a refresh."
                    );
                }
            }

            applyCart(next);
        } catch (failure) {
            if (!mounted.current) return;

            toast.error(failure.message);

            // Reload after conflicts or uncertain writes.
            try {
                const next = accountId
                    ? await getSavedCart()
                    : await quoteCart(
                          cartReferences(previous.items)
                      );

                if (mounted.current) {
                    applyCart(next);
                }
            } catch (reloadFailure) {
                if (mounted.current) {
                    setError(reloadFailure.message);
                }
            }
        } finally {
            if (mounted.current) {
                busy.current = false;
                setLoading(false);
            }
        }
    };

    const getQuantity = (productId) =>
        cart.items.find(
            (item) => item.product._id === productId
        )?.quantity || 0;

    return (
        <CartContext.Provider
            value={{
                ...cart,
                loading,
                ready,
                error,
                getQuantity,
                changeQuantity,
                refreshCart
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function CartProvider({ children }) {
    const { user } = useAuth();
    const accountId = user?._id || user?.id || "";

    return (
        <CartSession
            key={accountId || "guest"}
            accountId={accountId}
        >
            {children}
        </CartSession>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error(
            "useCart must be used inside CartProvider."
        );
    }

    return context;
}