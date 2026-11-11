const router = require("express").Router();

const { authMiddleware, authorize } = require("../middleware/authMiddleware");

const { adminReadLimiter, adminWriteLimiter } = require("../middleware/rateLimiter");

const delivery = require("../controllers/deliveryController");

router.use(authMiddleware);

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

// ================== DELIVERY AGENT ==================
router.get("/me", authorize("delivery"), delivery.me);

router.patch(
    "/availability",
    authorize("delivery"),
    adminWriteLimiter,
    delivery.changeAvailability
);

router.get("/tasks", authorize("delivery"), delivery.myTasks);

router.get("/tasks/:taskId", authorize("delivery"), delivery.myTask);

router.patch("/tasks/:taskId", authorize("delivery"), adminWriteLimiter, delivery.perform);

// ================== ADMIN AGENTS ==================
router.get("/admin/agents", authorize("admin"), adminReadLimiter, delivery.agents);

router.post("/admin/agents", authorize("admin"), adminWriteLimiter, delivery.saveAgent);

router.patch("/admin/agents/:agentId", authorize("admin"), adminWriteLimiter, delivery.saveAgent);

router.patch(
    "/admin/agents/:agentId/status",
    authorize("admin"),
    adminWriteLimiter,
    delivery.updateAgentStatus
);

// ================== ADMIN ASSIGNMENTS ==================
router.get("/admin/assignments", authorize("admin"), adminReadLimiter, delivery.assignments);

router.post("/admin/assignments/auto", authorize("admin"), adminWriteLimiter, delivery.autoAssign);

router.patch("/admin/assignments/:taskId", authorize("admin"), adminWriteLimiter, delivery.assign);

router.post(
    "/admin/assignments/:taskId/recover-otp",
    authorize("admin"),
    adminWriteLimiter,
    delivery.recoverOtp
);

module.exports = router;
