const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");

const { authMiddleware, authorize } = require("../middleware/authMiddleware");

const checkout = require("../controllers/checkoutController");

router.use(authMiddleware, authorize("customer"));

router.use(
    rateLimit({
        windowMs: 60000,
        limit: 30,
        standardHeaders: "draft-8",
        legacyHeaders: false,
    })
);

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.get("/active", checkout.active);
router.post("/quote", checkout.quote);
router.post("/", checkout.start);

module.exports = router;
