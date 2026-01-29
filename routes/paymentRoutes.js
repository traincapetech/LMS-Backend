const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.post(
  "/create-checkout-session",
  paymentController.createCheckoutSession
);
router.post("/verify-payment", paymentController.verifyPayment);
// Webhook needs raw body, usually defined in server.js directly or here with specific middleware
router.post('/webhook', express.raw({type: 'application/json'}), paymentController.webhook);

module.exports = router;