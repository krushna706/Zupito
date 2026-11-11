const router = require("express").Router();
const { authMiddleware, authorize, authorizeFulfilment } = require("../middleware/authMiddleware");
const limits = require("../middleware/rateLimiter");
const controller = require("../controllers/settlementController");
router.use(authMiddleware);
router.get("/", authorizeFulfilment("admin", "seller"), limits.adminReadLimiter, controller.list);
router.post("/:id/confirm", authorize("admin"), limits.adminWriteLimiter, controller.confirm);
module.exports = router;
