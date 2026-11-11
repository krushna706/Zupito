const router = require("express").Router();

const { rateLimit } = require("express-rate-limit");

const { authMiddleware, authorize } = require("../middleware/authMiddleware");

const refund = require("../controllers/refundController");

const writeLimiter = rateLimit({
    windowMs: 60000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
});

router.use(authMiddleware);

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

// ================== CUSTOMER ==================
router.post("/orders/:id/cancel", authorize("customer"), writeLimiter, refund.cancel);

// ================== ADMIN ==================
router.get("/admin", authorize("admin"), refund.list);

router.patch("/admin/:id/review", authorize("admin"), writeLimiter, refund.review);

router.post("/admin/:id/retry", authorize("admin"), writeLimiter, refund.retry);

module.exports = router;
