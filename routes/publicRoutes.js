const express = require("express");
const router = express.Router();
const publicController = require("../controllers/publicController");

router.get("/stats", publicController.getHomeStats);
router.post("/contact", publicController.submitContactForm);

module.exports = router;
