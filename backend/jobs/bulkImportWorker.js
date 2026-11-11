const jobService = require("../services/jobService");
const bulkImportService = require("../services/bulkImportService");

// ================== BULK IMPORT WORKER ==================
exports.start = () => {
    return jobService.schedule("bulk-imports", 3000, bulkImportService.process);
};
