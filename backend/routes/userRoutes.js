const express = require("express");
const { rateLimit } = require("express-rate-limit");

const user = require("../controllers/userController");
const address = require("../controllers/addressController");

const { authMiddleware } = require("../middleware/authMiddleware");
const { uploadProfileImage } = require("../middleware/uploadMiddleware");
const { profileUpdateLimiter } = require("../middleware/rateLimiter");

const validate = require("../middleware/validateMiddleware");
const { profileUpdateSchema } = require("../validations/schema");

const router = express.Router();

router.use(authMiddleware);

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.patch("/profile", profileUpdateLimiter, uploadProfileImage, validate(profileUpdateSchema), user.updateProfile);

router.use(
    "/addresses",
    rateLimit({
        windowMs: 60 * 1000,
        limit: 60,
        standardHeaders: "draft-8",
        legacyHeaders: false,

        keyGenerator: (req) => String(req.user._id),

        message: {
            success: false,
            message: "Too many address requests. Please try again shortly.",
        },
    })
);

router.get("/addresses", address.getAddresses);
router.post("/addresses", address.changeAddress("create"));
router.patch("/addresses/:addressId", address.changeAddress("update"));
router.delete("/addresses/:addressId", address.changeAddress("delete"));
router.patch("/addresses/:addressId/default", address.changeAddress("default"));

module.exports = router;