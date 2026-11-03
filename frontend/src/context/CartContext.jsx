import { createContext, useContext, useState } from "react";

const CartContext = createContext(null);

// ================== CART PROVIDER ==================
export function CartProvider({ children }) {
    const [items, setItems] = useState([]);

    const changeQuantity = (product, change) => {
        if (!Number.isInteger(change) || !change) return;

        setItems((current) => {
            const existing = current.find(
                (item) => item.product._id === product._id
            );

            const currentQuantity = existing?.quantity ?? 0;
            const nextQuantity = currentQuantity + change;

            if (nextQuantity <= 0) {
                return current.filter(
                    (item) => item.product._id !== product._id
                );
            }

            // Only allow additions within the known stock limit.
            if (
                change > 0 &&
                (
                    !Number.isInteger(product.stock) ||
                    nextQuantity > product.stock
                )
            ) {
                return current;
            }

            if (existing) {
                return current.map((item) => (
                    item.product._id === product._id
                        ? { product, quantity: nextQuantity }
                        : item
                ));
            }

            return [...current, { product, quantity: nextQuantity }];
        });
    };

    const getQuantity = (productId) => (
        items.find((item) => item.product._id === productId)?.quantity ?? 0
    );

    const cartCount = items.reduce(
        (total, item) => total + item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{ items, cartCount, getQuantity, changeQuantity }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error("useCart must be used inside CartProvider.");
    }

    return context;
}