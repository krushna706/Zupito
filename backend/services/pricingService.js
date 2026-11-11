const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const { calculatePricing } = require("../config/orderRules");
const ExpressError = require("../utils/ExpressError");

exports.quote = async (items, code, userId, session = null) => {
    const pricing = calculatePricing(items, "");
    if (!code) return pricing;
    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), enabled: true })
        .session(session)
        .lean();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (
        !coupon ||
        today < coupon.validFrom ||
        today > coupon.validUntil ||
        pricing.subtotal < Math.round(coupon.minOrder * 100) ||
        coupon.usageCount + coupon.reservedCount >= coupon.usageLimit
    ) {
        throw new ExpressError(
            409,
            "This coupon is unavailable, expired or does not meet the order minimum."
        );
    }
    const used = await Order.countDocuments({
        userId,
        "pricing.appliedCoupon": coupon.code,
        $or: [{ status: "Confirmed" }, { active: true }],
    }).session(session);
    if (used >= coupon.perCustomerLimit)
        throw new ExpressError(409, "You have reached this coupon's usage limit.");
    const discount =
        coupon.type === "Fixed"
            ? Math.round(coupon.value * 100)
            : Math.min(
                  Math.round((pricing.subtotal * coupon.value) / 100),
                  Math.round(coupon.maxDiscount * 100)
              );
    pricing.couponDiscount = Math.min(discount, pricing.subtotal - 100);
    if (pricing.couponDiscount <= 0)
        throw new ExpressError(409, "Order amount is too low for this coupon.");
    pricing.total -= pricing.couponDiscount;
    pricing.totalSavings += pricing.couponDiscount;
    pricing.appliedCoupon = coupon.code;
    return pricing;
};

exports.reserve = async (code, session) => {
    if (!code) return;
    const result = await Coupon.updateOne(
        {
            code,
            enabled: true,
            $expr: { $lt: [{ $add: ["$usageCount", "$reservedCount"] }, "$usageLimit"] },
        },
        { $inc: { reservedCount: 1 } },
        { session }
    );
    if (!result.modifiedCount)
        throw new ExpressError(409, "Coupon availability changed. Review checkout again.");
};
exports.settle = async (code, paid, session) => {
    if (!code) return;
    // Older orders used static coupons and have no reservation counter.
    await Coupon.updateOne(
        { code, reservedCount: { $gt: 0 } },
        {
            $inc: { reservedCount: -1, usageCount: paid ? 1 : 0 },
        },
        { session }
    );
};
