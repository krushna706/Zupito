const router = require("express").Router();
const { authMiddleware, authorize, authorizeFulfilment } = require("../middleware/authMiddleware");
const { uploadReplacementImages } = require("../middleware/uploadMiddleware");
const limits = require("../middleware/rateLimiter");
const controller = require("../controllers/replacementController");
router.use(authMiddleware);
router.get(
    "/",
    authorizeFulfilment("customer", "seller", "admin"),
    limits.adminReadLimiter,
    controller.list
);
router.post(
    "/",
    authorize("customer"),
    limits.adminWriteLimiter,
    uploadReplacementImages,
    controller.create
);
router.patch(
    "/:id",
    authorizeFulfilment("admin", "seller"),
    limits.adminWriteLimiter,
    controller.change
);
router.get(
    "/:id/code",
    authorizeFulfilment("customer", "seller"),
    limits.adminWriteLimiter,
    controller.code
);
module.exports = router;
