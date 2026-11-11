const jobService = require("../services/jobService");
const assignmentService = require("../services/assignmentService");

// ================== ASSIGNMENT WORKER ==================
exports.startAssignmentWorker = () => {
    return jobService.schedule("assignments", 15000, assignmentService.assignPending);
};
