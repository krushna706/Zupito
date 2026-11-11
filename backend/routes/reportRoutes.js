const router = require("express").Router();
const { authMiddleware, authorize } = require("../middleware/authMiddleware");
const { adminReadLimiter, adminWriteLimiter } = require("../middleware/rateLimiter");
const reportController = require("../controllers/reportController");

// ================== ADMIN REPORTS ==================
router.use(authMiddleware, authorize("admin"));
router.get("/", adminReadLimiter, reportController.snapshot);
router.get("/jobs", adminReadLimiter, reportController.listJobs);
router.post("/jobs/:id/retry", adminWriteLimiter, reportController.retryJob);

module.exports = router;
