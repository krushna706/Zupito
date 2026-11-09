import api from "./api";

const GUEST_CART_KEY = "zupito:guest-cart:v1";

export function cartReferences(items) {
    return items.map(({ product, quantity }) => ({
        productId: product.productId,
        variantId: product.variantId,
        quantity,
    }));
}

export function readGuestCart() {
    try {
        const stored = JSON.parse(
            localStorage.getItem(GUEST_CART_KEY) || "[]"
        );

        if (!Array.isArray(stored)) return [];

        const unique = new Map();

        for (const item of stored) {
            if (
                /^[a-f0-9]{24}$/i.test(item?.productId) &&
                typeof item.variantId === "string" &&
                item.variantId.length > 0 &&
                item.variantId.length <= 80 &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0 &&
                item.quantity <= 99
            ) {
                const normalized = {
                    productId: item.productId.toLowerCase(),
                    variantId: item.variantId,
                    quantity: item.quantity,
                };

                unique.set(
                    `${normalized.productId}::${normalized.variantId}`,
                    normalized
                );
            }
        }

        return [...unique.values()].slice(0, 50);
    } catch {
        return [];
    }
}

export function writeGuestCart(items) {
    try {
        localStorage.setItem(
            GUEST_CART_KEY,
            JSON.stringify(items)
        );

        return true;
    } catch {
        return false;
    }
}

export function isGuestCartEvent(event) {
    return event.key === GUEST_CART_KEY || event.key === null;
}

export async function quoteCart(items) {
    const { data } = await api.post("/cart/quote", { items });
    return data.cart;
}

export async function getSavedCart() {
    const { data } = await api.get("/cart");
    return data.cart;
}

export async function saveCart(items, version) {
    const { data } = await api.put("/cart", {
        items,
        version,
    });

    return data.cart;
}

const FREE_DELIVERY_MINIMUM = 499;
const STANDARD_DELIVERY_CHARGE = 40;

export const coupons = {
    ZUPITO10: {
        minAmount: 499,
        type: "percentage",
        value: 10,
        maxDiscount: 100
    },
    WELCOME50: {
        minAmount: 999,
        type: "fixed",
        value: 50
    }
};

const roundPrice = (amount) => Math.round(amount * 100) / 100;

export function calculateCheckoutPricing(cartItems = [], couponCode = "") {
    const items = Array.isArray(cartItems) ? cartItems : [];

    const itemCount = items.reduce(
        (total, item) => total + item.quantity,
        0
    );

    const subtotal = roundPrice(
        items.reduce(
            (total, item) => total + item.price * item.quantity,
            0
        )
    );

    const productDiscount = roundPrice(
        items.reduce(
            (total, item) =>
                total +
                Math.max(0, item.mrp - item.price) * item.quantity,
            0
        )
    );

    const originalPrice = roundPrice(subtotal + productDiscount);

    const deliveryCharge =
        items.length === 0 || subtotal >= FREE_DELIVERY_MINIMUM
            ? 0
            : STANDARD_DELIVERY_CHARGE;

    const amountForFreeDelivery = roundPrice(
        Math.max(0, FREE_DELIVERY_MINIMUM - subtotal)
    );

    const code = String(couponCode).trim().toUpperCase();
    const coupon = coupons[code];

    let couponDiscount = 0;

    if (coupon && subtotal >= coupon.minAmount) {
        couponDiscount =
            coupon.type === "percentage"
                ? Math.min(
                      (subtotal * coupon.value) / 100,
                      coupon.maxDiscount
                  )
                : coupon.value;

        couponDiscount = roundPrice(
            Math.min(couponDiscount, subtotal)
        );
    }

    const total = roundPrice(
        Math.max(0, subtotal - couponDiscount + deliveryCharge)
    );

    const totalSavings = roundPrice(
        productDiscount + couponDiscount
    );

    return {
        itemCount,
        originalPrice,
        subtotal,
        productDiscount,
        couponDiscount,
        deliveryCharge,
        amountForFreeDelivery,
        total,
        totalSavings,
        appliedCoupon: couponDiscount > 0 ? code : ""
    };
}