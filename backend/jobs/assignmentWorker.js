
const assignmentService = require("../services/assignmentService");

exports.startAssignmentWorker = () => {
    let working = false;

    const run = async () => {
        if (working) return;

        working = true;

        try {
            await assignmentService.assignPending();
        } catch {
            console.warn("Delivery assignments will retry.");
        } finally {
            working = false;
        }
    };

    run();

    const timer = setInterval(run, 15000);
    timer.unref();

    return () => clearInterval(timer);
};
