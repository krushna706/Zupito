const jobService = require("../services/jobService");

const Refund = require("../models/Refund");
const refundService = require("../services/refundService");

// ================== REFUND RECONCILIATION ==================
exports.startRefundWorker = () => {
    return jobService.schedule("refundWorker", 30000, async () => {
        const rows = await Refund.find({
            status: {
                $in: ["Queued", "Pending"],
            },
            nextCheckAt: {
                $lte: new Date(),
            },
            lockUntil: {
                $lte: new Date(),
            },
        })
            .sort({ nextCheckAt: 1 })
            .limit(20)
            .select("_id")
            .lean();

        for (const row of rows) {
            await refundService.processOne(row._id);
        }
    });
};
