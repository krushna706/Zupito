const express = require("express");
const mongoose = require("mongoose");

const category = require("../controllers/categoryController");
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

router.param("categoryId", (req, res, next, categoryId) => {
    if (!mongoose.isObjectIdOrHexString(categoryId)) {
        return next(new ExpressError(400, "Invalid category ID."));
    }

    next();
});

router.get("/", limits.categoryReadLimiter, category.getCategories);
router.post("/", limits.categoryWriteLimiter, validate(schema.categoryCreateSchema), category.createCategory);
router.patch("/:categoryId", limits.categoryWriteLimiter, validate(schema.categoryUpdateSchema), category.updateCategory);
router.patch("/:categoryId/status", limits.categoryWriteLimiter, validate(schema.categoryStatusSchema), category.updateCategoryStatus);

module.exports = router;