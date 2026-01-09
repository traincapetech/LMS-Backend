const express = require("express");
const router = express.Router();
const { sendOtp, verifyOtp } = require("../controllers/otpController");

// POST /api/send-otp
router.post("/send-otp", sendOtp);

// POST /api/verify-otp
router.post("/otp/verify-otp", verifyOtp);

// Add this route for frontend compatibility
router.post("/otp/send", sendOtp);

module.exports = router;
