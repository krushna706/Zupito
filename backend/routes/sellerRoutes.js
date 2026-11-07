const express = require("express");
const mongoose = require("mongoose");

const seller = require("../controllers/sellerController");
const product = require("../controllers/productController");
const { authMiddleware, authorize } = require("../middleware/authMiddleware");
const { uploadStoreLogo, uploadProductImages } = require("../middleware/uploadMiddleware");
const validate = require("../middleware/validateMiddleware");
const limits = require("../middleware/rateLimiter");
const schema = require("../validations/schema");
const ExpressError = require("../utils/ExpressError");

const router = express.Router();

router.use(authMiddleware, authorize("seller"));

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.param("productId", (req, res, next, productId) => {
    if (!mongoose.isObjectIdOrHexString(productId)) {
        return next(new ExpressError(400, "Invalid product ID."));
    }

    next();
});

router.get("/store", limits.sellerReadLimiter, seller.getStoreProfile);
router.patch("/store", limits.sellerWriteLimiter, uploadStoreLogo, validate(schema.storeProfileSchema), seller.updateStoreProfile);

router.get("/product-categories", limits.sellerReadLimiter, product.getProductCategories);
router.get("/products", limits.sellerReadLimiter, product.getSellerProducts);
router.get("/products/:productId", limits.sellerReadLimiter, product.getSellerProduct);
router.post("/products", limits.sellerWriteLimiter, uploadProductImages, product.parseProductBody, validate(schema.productCreateSchema), product.createSellerProduct);
router.patch("/products/:productId", limits.sellerWriteLimiter, uploadProductImages, product.parseProductBody, validate(schema.productUpdateSchema), product.updateSellerProduct);

module.exports = router;