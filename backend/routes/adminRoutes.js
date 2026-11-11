const express = require("express");
const mongoose = require("mongoose");

const admin = require("../controllers/adminController");
const payment = require("../controllers/paymentController");
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

function validateId(req, res, next, value) {
    if (!mongoose.isObjectIdOrHexString(value)) {
        return next(new ExpressError(400, "Invalid record ID."));
    }

    next();
}

router.param("sellerId", validateId);
router.param("productId", validateId);

// Seller management
router.get("/sellers", limits.adminReadLimiter, admin.getSellers);
router.patch(
    "/sellers/:sellerId/status",
    limits.adminWriteLimiter,
    validate(schema.adminSellerStatusSchema),
    admin.updateSellerStatus
);

// Product management
router.get("/products", limits.adminReadLimiter, admin.getAdminProducts);
router.get("/products/:productId", limits.adminReadLimiter, admin.getAdminProduct);
router.patch(
    "/products/:productId/status",
    limits.adminWriteLimiter,
    validate(schema.adminProductDecisionSchema),
    admin.updateProductStatus
);
router.post(
    "/products/bulk-status",
    limits.adminWriteLimiter,
    validate(schema.adminProductBulkSchema),
    admin.bulkProductStatus
);

router.get("/customers", limits.adminReadLimiter, admin.customers);
router.patch("/customers/:customerId/status", limits.adminWriteLimiter, admin.customerStatus);

router.get("/payments", limits.adminReadLimiter, payment.list);
router.patch("/payments/:id/review", limits.adminWriteLimiter, payment.review);

module.exports = router;
