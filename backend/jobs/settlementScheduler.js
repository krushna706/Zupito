const jobService = require("../services/jobService");
const settlementService = require("../services/settlementService");

// ================== SETTLEMENT SCHEDULER ==================
exports.start = () => {
    return jobService.schedule("settlements", 86400000, settlementService.prepare);
};
