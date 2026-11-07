const express = require("express");

const auth = require("../controllers/authController");
const reset = require("../controllers/passwordResetController");
const { authMiddleware } = require("../middleware/authMiddleware");
const validate = require("../middleware/validateMiddleware");
const limits = require("../middleware/rateLimiter");
const schema = require("../validations/schema");

const router = express.Router();

router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

router.post("/signup", limits.signupLimiter, validate(schema.signupSchema), auth.signup);
router.post("/seller-register", limits.signupLimiter, validate(schema.sellerRegisterSchema), auth.registerSeller);
router.post("/login", limits.loginIpLimiter, validate(schema.loginSchema), limits.loginAccountLimiter, auth.login);
router.get("/me", authMiddleware, auth.getCurrentUser);
router.post("/logout", authMiddleware, auth.logout);

router.post("/forgot-password/request", limits.resetRequestLimiter, validate(schema.forgotPasswordRequestSchema), reset.requestPasswordResetOtp);
router.post("/forgot-password/verify", limits.resetVerifyLimiter, validate(schema.forgotPasswordVerifySchema), reset.verifyPasswordResetOtp);
router.post("/forgot-password/reset", limits.resetPasswordLimiter, validate(schema.forgotPasswordResetSchema), reset.resetPassword);

module.exports = router;