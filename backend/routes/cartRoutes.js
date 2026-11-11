const express = require("express");
const { rateLimit } = require("express-rate-limit");

const cart = require("../controllers/cartController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(
    rateLimit({
        windowMs: 60 * 1000,
        limit: 120,
        standardHeaders: "draft-8",
        legacyHeaders: false,

        message: {
            success: false,
            message: "Too many cart requests. Please try again shortly.",
        },
    })
);

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.post("/quote", cart.quoteCart);
router.get("/", authMiddleware, cart.getCart);
router.put("/", authMiddleware, cart.saveCart);

module.exports = router;
