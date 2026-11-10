const Payment = require("../models/Payment");

const {
    synchronizePayment,
} = require("../services/payment/paymentService");

exports.startPaymentReconciliation = () => {
    let running = false;

    const reconcile = async () => {
        if (running) return;
        running = true;

        try {
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
                            console.warn(
                                "Payment reconciliation pending:",
                                String(row.orderId)
                            );
                        }
                    })
                );
            }
        } catch {
            console.warn("Payment reconciliation will retry.");
        } finally {
            running = false;
        }
    };

    reconcile();

    const timer = setInterval(reconcile, 15000);
    timer.unref();

    return () => clearInterval(timer);
};