const express = require("express");

const user = require("../controllers/userController");
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

module.exports = router;