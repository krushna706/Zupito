const express = require("express");
const mongoose = require("mongoose");

const admin = require("../controllers/adminController");
const { authMiddleware, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateMiddleware");
const limits = require("../middleware/rateLimiter");
const schema = require("../validations/schema");
const ExpressError = require("../utils/ExpressError");

const router = express.Router();

router.use(authMiddleware, authorize("admin"));

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.param("sellerId", (req, res, next, sellerId) => {
    if (!mongoose.isObjectIdOrHexString(sellerId)) {
        return next(new ExpressError(400, "Invalid seller profile ID."));
    }

    next();
});

router.get("/sellers", limits.adminReadLimiter, admin.getSellers);
router.patch("/sellers/:sellerId/status", limits.adminWriteLimiter, validate(schema.adminSellerStatusSchema), admin.updateSellerStatus);

module.exports = router;