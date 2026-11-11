const jobService = require("../services/jobService");
const Payment = require("../models/Payment");

const { synchronizePayment } = require("../services/payment/paymentService");

exports.startPaymentReconciliation = () => {
    return jobService.schedule("paymentReconciliation", 30000, async () => {
        const rows = await Payment.find({
            nextCheckAt: {
                $ne: null,
                $lte: new Date(),
            },
            lockUntil: {
                $lte: new Date(),
            },
        })
            .sort({ nextCheckAt: 1 })
            .limit(50)
            .select("orderId")
            .lean();

        for (let offset = 0; offset < rows.length; offset += 5) {
            await Promise.all(
                rows.slice(offset, offset + 5).map(async (row) => {
                    try {
                        await synchronizePayment(row.orderId);
                    } catch {
                        console.warn("Payment reconciliation pending:", String(row.orderId));
                    }
                })
            );
        }
    });
};
