const router = require("express").Router();
const { authMiddleware, authorize } = require("../middleware/authMiddleware");
const { rateLimit } = require("express-rate-limit");
const limits = require("../middleware/rateLimiter");
const { uploadComplaintImage } = require("../middleware/uploadMiddleware");
const controller = require("../controllers/complaintController");
router.post("/enquiries", rateLimit({ windowMs: 3600000, limit: 5 }), controller.create);
router.use(authMiddleware);
router.get("/", authorize("customer", "admin"), limits.adminReadLimiter, controller.list);
router.post(
    "/",
    authorize("customer"),
    limits.profileUpdateLimiter,
    uploadComplaintImage,
    controller.create
);
router.patch("/:id", authorize("admin"), limits.adminWriteLimiter, controller.update);
module.exports = router;
