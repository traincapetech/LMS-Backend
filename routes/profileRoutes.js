const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");

router.get("/", profileController.getProfile);
router.put("/", profileController.updateProfile);
router.get("/instructors", profileController.getInstructors);

router.get("/get-wishlist", profileController.getWishlist);
router.post("/add-to-wishlist", profileController.addToWishlist);
router.delete("/remove-from-wishlist/:courseId", profileController.removeFromWishlist);

module.exports = router;
