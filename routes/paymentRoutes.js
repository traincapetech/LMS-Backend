const express = require("express");
const router = express.Router();
const requireAuth = require("../utils/requireAuth");
const paymentController = require("../controllers/paymentController");

router.use(requireAuth);

router.post("/checkout", paymentController.checkoutCart);
router.post("/stripe/session", paymentController.createStripeSession);
router.post("/confirm", paymentController.confirmOrder);

module.exports = router;
