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

// Update the visible cart while the server validates the change.
function previewCart(base, items) {
    let subtotal = 0;
    let discount = 0;

    const nextItems = items.map(({ product, quantity }) => {
        const price = Number(product.price);
        const mrp = Number(product.mrp);

        const valid =
            product.validPrice !== false &&
            Number.isFinite(price) &&
            price > 0;

        if (valid) {
            const pricePaise = Math.round(price * 100);
            const mrpPaise = Math.round(
                (Number.isFinite(mrp) ? mrp : price) * 100
            );

            subtotal += pricePaise * quantity;
            discount += Math.max(0, mrpPaise - pricePaise) * quantity;
        }

        const availableForPurchase =
            valid &&
            product.availableForPurchase !== false &&
            Number(product.stock) > 0;

        return {
            product: {
                ...product,
                validPrice: valid,
                availableForPurchase
            },
            quantity,
            available:
                availableForPurchase &&
                quantity <= Number(product.stock)
        };
    });

    return {
        ...base,
        items: nextItems,
        cartCount: nextItems.reduce(
            (total, item) => total + item.quantity,
            0
        ),
        subtotal: subtotal / 100,
        discount: discount / 100,
        canCheckout:
            nextItems.length > 0 &&
            nextItems.every((item) => item.available)
    };
}

function CartSession({ accountId, children }) {
    const [cart, setCart] = useState(emptyCart);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState("");

    const current = useRef(emptyCart);
    const confirmed = useRef(emptyCart);
    const revision = useRef(0);

    const busy = useRef(true);
    const saving = useRef(false);
    const blocked = useRef(false);
    const mounted = useRef(false);
    const timer = useRef(null);

    const guestMemory = useRef(readGuestCart());
    const mergePending = useRef(true);

    const applyCart = useCallback((next) => {
        confirmed.current = next;
        current.current = next;
        blocked.current = false;

        setCart(next);
        setReady(true);
        setError("");
    }, []);

    // Merge the guest cart once after sign-in.
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

            next = await saveCart([...merged.values()], next.version);

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
            clearTimeout(timer.current);
        };
    }, [readCart, applyCart]);

    // Never refresh over an unconfirmed quantity change.
    const refreshCart = useCallback(async () => {
        if (busy.current) return null;

        busy.current = true;
        setLoading(true);

        try {
            const next = await readCart(() => mounted.current);

            if (!mounted.current || !next) return null;

            applyCart(next);
            return next;
        } catch (failure) {
            if (mounted.current) setError(failure.message);
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
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [accountId, refreshCart]);

    // Warn before closing the tab while changes are still saving.
    useEffect(() => {
        const warn = (event) => {
            if (!saving.current && !timer.current) return;

            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", warn);

        return () => {
            window.removeEventListener("beforeunload", warn);
        };
    }, []);

    const flushChanges = async () => {
        timer.current = null;

        if (!mounted.current || saving.current) return;

        saving.current = true;

        try {
            while (mounted.current) {
                const sentRevision = revision.current;
                const desired = current.current;
                const references = cartReferences(desired.items);

                const next = accountId
                    ? await saveCart(references, confirmed.current.version)
                    : await quoteCart(references);

                if (!mounted.current) return;

                if (!accountId) {
                    const invalid = next.items.find((item) => {
                        const old = confirmed.current.items.find(
                            (entry) =>
                                entry.product._id === item.product._id
                        );

                        return (
                            item.quantity > (old?.quantity || 0) &&
                            !item.available
                        );
                    });

                    if (invalid) {
                        throw new Error(
                            invalid.product.issue ||
                            "This item is unavailable."
                        );
                    }

                    guestMemory.current = cartReferences(next.items);

                    if (!writeGuestCart(guestMemory.current)) {
                        toast.warning(
                            "Browser storage is unavailable. Your cart may not survive a refresh."
                        );
                    }
                }

                confirmed.current = next;

                if (revision.current === sentRevision) {
                    applyCart(next);
                    break;
                }

                // Keep newer clicks while adopting current server product data.
                const products = new Map(
                    next.items.map((item) => [
                        item.product._id,
                        item.product
                    ])
                );

                const rebased = current.current.items.map((item) => ({
                    ...item,
                    product:
                        products.get(item.product._id) ||
                        item.product
                }));

                current.current = previewCart(next, rebased);
                setCart(current.current);
            }
        } catch (failure) {
            if (!mounted.current) return;

            blocked.current = true;
            current.current = confirmed.current;
            setCart(confirmed.current);

            toast.error(
                `${failure.message} Cart changes could not be confirmed. Refreshing your cart.`
            );

            // Reconcile uncertain writes instead of retrying a stale version.
            try {
                const next = accountId
                    ? await getSavedCart()
                    : await quoteCart(guestMemory.current);

                if (mounted.current) applyCart(next);
            } catch (reloadFailure) {
                if (mounted.current) {
                    setError(reloadFailure.message);
                }
            }
        } finally {
            saving.current = false;

            if (mounted.current) {
                busy.current = false;
                setUpdating(false);
                setLoading(false);
            }
        }
    };

    const changeQuantity = (product, change) => {
        if (!Number.isInteger(change) || !change) return;

        if (blocked.current) {
            toast.error(
                "Your cart could not be synced. Open Cart and retry."
            );
            return;
        }

        if (busy.current && !saving.current && !timer.current) {
            toast.info(
                "Your cart is being checked. Please try again shortly."
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

        const source = existing?.product || product;
        const quantity = Math.max(
            0,
            (existing?.quantity || 0) + change
        );

        if (quantity === (existing?.quantity || 0)) return;

        if (quantity > 99) {
            toast.error("Maximum 99 units per variant.");
            return;
        }

        if (
            change > 0 &&
            (
                source.availableForPurchase === false ||
                source.validPrice === false ||
                !Number.isFinite(Number(source.price)) ||
                Number(source.price) <= 0 ||
                !Number.isInteger(Number(source.stock)) ||
                quantity > Number(source.stock)
            )
        ) {
            toast.error(
                source.issue ||
                "The requested quantity is unavailable."
            );
            return;
        }

        const nextItems = previous.items
            .map((item) =>
                item.product._id === product._id
                    ? { ...item, quantity }
                    : item
            )
            .filter((item) => item.quantity > 0);

        if (!existing && quantity) {
            nextItems.push({ product: source, quantity });
        }

        if (nextItems.length > 50) {
            toast.error("Maximum 50 different variants per cart.");
            return;
        }

        revision.current += 1;
        current.current = previewCart(previous, nextItems);

        setCart(current.current);
        setError("");

        busy.current = true;
        setLoading(true);
        setUpdating(true);

        // Combine quick clicks and serialize cart writes.
        if (!saving.current) {
            clearTimeout(timer.current);
            timer.current = setTimeout(flushChanges, 250);
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
                updating,
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
        <CartSession key={accountId || "guest"} accountId={accountId}>
            {children}
        </CartSession>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error("useCart must be used inside CartProvider.");
    }

    return context;
}