const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/signup", authController.signup);
router.post("/login", authController.login);

router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-otp", authController.verifyOtp);
router.post("/verify-email", authController.verifyEmail);
router.post("/verify-email/resend", authController.resendVerificationOtp);

// Account Settings routes
router.post("/change-password", authController.changePassword);
router.post("/close-account", authController.closeAccount);

module.exports = router;
