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

    const itemCount = items.reduce((total, item) => total + item.quantity, 0);

    const subtotal = roundPrice(items.reduce((total, item) => total + item.price * item.quantity, 0));

    const productDiscount = roundPrice(
        items.reduce((total, item) => total + Math.max(0, item.mrp - item.price) * item.quantity, 0)
    );

    const originalPrice = roundPrice(subtotal + productDiscount);

    const deliveryCharge =
        items.length === 0 || subtotal >= FREE_DELIVERY_MINIMUM ? 0 : STANDARD_DELIVERY_CHARGE;

    const amountForFreeDelivery = roundPrice(Math.max(0, FREE_DELIVERY_MINIMUM - subtotal));

    const code = String(couponCode).trim().toUpperCase();
    const coupon = coupons[code];

    let couponDiscount = 0;

    if (coupon && subtotal >= coupon.minAmount) {
        couponDiscount =
            coupon.type === "percentage"
                ? Math.min((subtotal * coupon.value) / 100, coupon.maxDiscount)
                : coupon.value;

        couponDiscount = roundPrice(Math.min(couponDiscount, subtotal));
    }

    const total = roundPrice(Math.max(0, subtotal - couponDiscount + deliveryCharge));

    const totalSavings = roundPrice(productDiscount + couponDiscount);

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
