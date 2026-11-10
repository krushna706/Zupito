const ExpressError = require("../utils/ExpressError");

exports.RESERVATION_MS = 30 * 60 * 1000;

exports.calculatePricing = (items, couponCode = "") => {
    const subtotal = items.reduce(
        (sum, item) => sum + item.pricePaise * item.quantity,
        0
    );

    const originalPrice = items.reduce(
        (sum, item) => sum + item.mrpPaise * item.quantity,
        0
    );

    if (
        !Number.isSafeInteger(subtotal) ||
        !Number.isSafeInteger(originalPrice)
    ) {
        throw new ExpressError(400, "Invalid order pricing.");
    }

    const code = couponCode.trim().toUpperCase();

    const coupons = {
        ZUPITO10: {
            minimum: 49900,
            discount: Math.min(Math.round(subtotal / 10), 10000),
        },
        WELCOME50: {
            minimum: 99900,
            discount: 5000,
        },
    };

    const coupon = Object.hasOwn(coupons, code) ? coupons[code] : null;

    if (code && (!coupon || subtotal < coupon.minimum)) {
        throw new ExpressError(
            400,
            "This coupon is not eligible for your cart."
        );
    }

    const couponDiscount = coupon
        ? Math.min(coupon.discount, subtotal)
        : 0;

    const deliveryCharge = subtotal >= 49900 ? 0 : 4000;
    const total = subtotal - couponDiscount + deliveryCharge;

    if (
        !Number.isSafeInteger(total) ||
        total < 100 ||
        total > 50000000
    ) {
        throw new ExpressError(
            400,
            "Order total must be between ₹1 and ₹5,00,000."
        );
    }

    return {
        itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
        originalPrice,
        subtotal,
        productDiscount: originalPrice - subtotal,
        couponDiscount,
        deliveryCharge,
        amountForFreeDelivery: Math.max(0, 49900 - subtotal),
        total,
        totalSavings: originalPrice - subtotal + couponDiscount,
        appliedCoupon: coupon ? code : "",
    };
};

exports.displayPricing = (pricing) =>
    Object.fromEntries(
        Object.entries(pricing).map(([key, value]) => [
            key,
            key === "itemCount" || key === "appliedCoupon"
                ? value
                : value / 100,
        ])
    );