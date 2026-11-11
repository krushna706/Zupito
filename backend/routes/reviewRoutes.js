const router = require("express").Router();
const { authMiddleware, authorize, authorizeFulfilment } = require("../middleware/authMiddleware");
const limits = require("../middleware/rateLimiter");
const reviews = require("../controllers/reviewController");
router.get("/products/:productId", limits.publicCatalogLimiter, reviews.list);
router.use(authMiddleware);
router.get(
    "/products/:productId/eligibility",
    authorize("customer"),
    limits.adminReadLimiter,
    reviews.eligibility
);
router.get(
    "/manage",
    authorizeFulfilment("admin", "seller"),
    limits.adminReadLimiter,
    reviews.list
);
router.post("/", authorize("customer"), limits.adminWriteLimiter, reviews.create);
router.patch("/:id/reply", authorizeFulfilment("seller"), limits.adminWriteLimiter, reviews.reply);
router.patch("/:id", authorize("admin"), limits.adminWriteLimiter, reviews.moderate);
module.exports = router;
