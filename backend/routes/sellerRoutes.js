const express = require("express");

const seller = require("../controllers/sellerController");
const { authMiddleware, authorize } = require("../middleware/authMiddleware");
const { uploadStoreLogo } = require("../middleware/uploadMiddleware");
const validate = require("../middleware/validateMiddleware");
const limits = require("../middleware/rateLimiter");
const { storeProfileSchema } = require("../validations/schema");

const router = express.Router();

router.use(authMiddleware, authorize("seller"));

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.get("/store", limits.sellerReadLimiter, seller.getStoreProfile);
router.patch("/store", limits.sellerWriteLimiter, uploadStoreLogo, validate(storeProfileSchema), seller.updateStoreProfile);

module.exports = router;