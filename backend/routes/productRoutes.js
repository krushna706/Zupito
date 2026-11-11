const express = require("express");
const mongoose = require("mongoose");

const product = require("../controllers/productController");
const { publicCatalogLimiter } = require("../middleware/rateLimiter");
const ExpressError = require("../utils/ExpressError");

const router = express.Router();

router.use(publicCatalogLimiter);

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.param("productId", (req, res, next, value) => {
    if (!mongoose.isObjectIdOrHexString(value)) {
        return next(new ExpressError(400, "Invalid product ID."));
    }

    next();
});

// Public products
router.get("/", product.getPublicProducts);
router.get("/:productId", product.getPublicProduct);

module.exports = router;
