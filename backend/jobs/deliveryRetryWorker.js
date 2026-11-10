
const deliveryService = require("../services/deliveryService");

exports.startDeliveryRetryWorker = () => {
    let working = false;

    const run = async () => {
        if (working) return;

        working = true;

        try {
            await deliveryService.retryDue();
        } catch {
            console.warn("Delivery retries will resume.");
        } finally {
            working = false;
        }
    };

    run();

    const timer = setInterval(run, 30000);
    timer.unref();

    return () => clearInterval(timer);
};
