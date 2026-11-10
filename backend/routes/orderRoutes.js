
const router = require("express").Router();
const { rateLimit } = require("express-rate-limit");

const {
    authMiddleware,
    authorize,
} = require("../middleware/authMiddleware");

const orders = require("../controllers/orderController");

const updateLimiter = rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        message: "Too many order updates. Please try again shortly.",
    },
});

router.use(authMiddleware);

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

// ================== STAFF ORDERS ==================
router.get("/manage", authorize("admin", "seller"), orders.managedList);
router.get("/manage/:id", authorize("admin"), orders.managedDetail);
router.get("/manage/:id/parcels/:parcelId", authorize("seller"), orders.managedDetail);
router.patch("/manage/:id/parcels/:parcelId", authorize("seller"), updateLimiter, orders.advance);

// ================== SELLER PICKUP OTP ==================
router.get("/manage/:id/parcels/:parcelId/pickup-otp", authorize("seller"), orders.pickupOtp);
router.post("/manage/:id/parcels/:parcelId/pickup-otp", authorize("seller"), updateLimiter, orders.regeneratePickupOtp);

// ================== CUSTOMER ORDERS ==================
router.get("/", authorize("customer"), orders.list);
router.get("/:id", authorize("customer"), orders.detail);

module.exports = router;
