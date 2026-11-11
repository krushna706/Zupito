const jobService = require("../services/jobService");
const deliveryService = require("../services/deliveryService");

// ================== DELIVERY RETRY WORKER ==================
exports.startDeliveryRetryWorker = () => {
    return jobService.schedule("delivery-retries", 30000, deliveryService.retryDue);
};
