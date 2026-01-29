const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const requireAuth = require("../utils/requireAuth");

router.post("/signup", authController.signup);
router.post("/login", authController.login);

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-otp", authController.verifyOtp);
router.post("/verify-email", authController.verifyEmail);
router.post("/verify-email/resend", authController.resendVerificationOtp);

// Account Settings routes (authenticated)
router.post("/change-password", requireAuth, authController.changePassword);
router.post("/close-account", requireAuth, authController.closeAccount);

module.exports = router;
