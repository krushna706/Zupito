const express = require("express");
const mongoose = require("mongoose");

const category = require("../controllers/categoryController");
const { authMiddleware, authorize } = require("../middleware/authMiddleware");
const { uploadProductImages } = require("../middleware/uploadMiddleware");
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

router.param("categoryId", (req, res, next, value) => {
    if (!mongoose.isObjectIdOrHexString(value)) {
        return next(new ExpressError(400, "Invalid category ID."));
    }

    next();
});

// Category management
router.get("/", limits.categoryReadLimiter, category.getCategories);
router.post("/", limits.categoryWriteLimiter, uploadProductImages, category.parseBody, validate(schema.categoryCreateSchema), category.saveCategory);
router.patch("/:categoryId", limits.categoryWriteLimiter, uploadProductImages, category.parseBody, validate(schema.categoryUpdateSchema), category.saveCategory);
router.patch("/:categoryId/status", limits.categoryWriteLimiter, validate(schema.categoryStatusSchema), category.updateCategoryStatus);

module.exports = router;