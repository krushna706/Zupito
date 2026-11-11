const ExpressError = require("../utils/ExpressError");

exports.RESERVATION_MS = 30 * 60 * 1000;

exports.calculatePricing = (items) => {
    const subtotal = items.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);

    const originalPrice = items.reduce((sum, item) => sum + item.mrpPaise * item.quantity, 0);

    if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(originalPrice)) {
        throw new ExpressError(400, "Invalid order pricing.");
    }

    const couponDiscount = 0;

    const deliveryCharge = subtotal >= 49900 ? 0 : 4000;
    const total = subtotal - couponDiscount + deliveryCharge;

    if (!Number.isSafeInteger(total) || total < 100 || total > 50000000) {
        throw new ExpressError(400, "Order total must be between ₹1 and ₹5,00,000.");
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
        appliedCoupon: "",
    };
};

exports.displayPricing = (pricing) =>
    Object.fromEntries(
        Object.entries(pricing).map(([key, value]) => [
            key,
            key === "itemCount" || key === "appliedCoupon" ? value : value / 100,
        ])
    );
