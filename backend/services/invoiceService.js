const PDFDocument = require("pdfkit");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const ExpressError = require("../utils/ExpressError");

// Render the paid checkout snapshot, never current catalogue prices.
exports.createInvoice = async (user, orderId) => {
    const order = await Order.findOne({
        _id: orderId,
        ...(user.role === "admin" ? {} : { userId: user._id }),
        status: "Confirmed",
    }).lean();
    if (!order) throw new ExpressError(404, "Paid order not found.");
    const payment = await Payment.findOne({ orderId }).select("providerPaymentId").lean();
    const pdf = new PDFDocument({ size: "A4", margin: 48, bufferPages: true });
    const chunks = [];
    const output = new Promise((resolve, reject) => {
        pdf.on("data", (chunk) => chunks.push(chunk));
        pdf.on("end", () => resolve(Buffer.concat(chunks)));
        pdf.on("error", reject);
    });
    const money = (paise) => `INR ${(paise / 100).toFixed(2)}`;
    const line = (label, value) => {
        if (pdf.y > 710) pdf.addPage();
        pdf.font("Helvetica-Bold").fontSize(10).text(label);
        pdf.font("Helvetica")
            .text(String(value || "—"))
            .moveDown(0.6);
    };
    pdf.fillColor("#071b45").fontSize(24).text("Zupito");
    pdf.fontSize(15).text("Order receipt").moveDown();
    line("Receipt number", `ZUP-${order._id}`);
    line(
        "Order date",
        new Date(order.confirmedAt || order.createdAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
        })
    );
    const a = order.address;
    line(
        "Deliver to",
        [a.name, a.house, a.area, a.landmark, a.city, a.state, a.pincode, a.phone]
            .filter(Boolean)
            .join(", ")
    );
    line("Payment", `Razorpay | ${payment?.providerPaymentId || "Confirmed"}`);
    for (const item of order.items) {
        if (pdf.y > 620) pdf.addPage();
        line(
            item.name,
            [item.variantLabel, `SKU: ${item.sku}`, `Quantity: ${item.quantity}`]
                .filter(Boolean)
                .join(" | ")
        );
        pdf.text(
            `${money(item.pricePaise)} each  |  ${money(item.pricePaise * item.quantity)}`
        ).moveDown();
    }
    line("Items subtotal", money(order.pricing.subtotal));
    line("Coupon discount", money(order.pricing.couponDiscount));
    line("Delivery charge", money(order.pricing.deliveryCharge));
    line("Amount paid", money(order.pricing.total));
    pdf.fontSize(9)
        .fillColor("#626975")
        .text(
            "This receipt records the original payment. Any cancellation refund is shown separately in your order details. This is not a GST tax invoice; seller tax registration details are not collected by this portfolio marketplace."
        );
    const pages = pdf.bufferedPageRange();
    for (let index = 0; index < pages.count; index++) {
        pdf.switchToPage(index);
        pdf.fontSize(8).text(`Zupito | ${index + 1} / ${pages.count}`, 48, 775, {
            lineBreak: false,
        });
    }
    pdf.end();
    return output;
};
