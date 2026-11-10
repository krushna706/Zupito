const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");

const {
    authMiddleware,
    authorize,
} = require("../middleware/authMiddleware");

const payment = require("../controllers/paymentController");

router.use(authMiddleware, authorize("customer"));

router.use(
    rateLimit({
        windowMs: 60000,
        limit: 60,
        standardHeaders: "draft-8",
        legacyHeaders: false,
    })
);

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.get("/:id", payment.status);
router.post("/:id/verify", payment.verify);

module.exports = router;