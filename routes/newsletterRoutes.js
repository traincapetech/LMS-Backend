const express = require("express");
const router = express.Router();
const {
  subscribe,
  sendNewsletter,
  getSubscribers,
  unsubscribe,
} = require("../controllers/newsletterController");
const requireAdmin = require("../utils/requireAdmin");
const requireAuth = require("../utils/requireAuth");

router.post("/subscribe", subscribe);
router.post("/send", requireAuth, requireAdmin, sendNewsletter);
router.get("/", requireAuth, requireAdmin, getSubscribers);
router.post("/unsubscribe", unsubscribe);

module.exports = router;
