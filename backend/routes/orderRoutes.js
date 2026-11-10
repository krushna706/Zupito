const router = require("express").Router();

const {
    authMiddleware,
    authorize,
} = require("../middleware/authMiddleware");

const orders = require("../controllers/orderController");

router.use(authMiddleware, authorize("customer"));

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.get("/", orders.list);
router.get("/:id", orders.detail);

module.exports = router;