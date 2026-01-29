const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Course = require("../models/Course");
const Coupon = require("../models/Coupon");
const User = require("../models/User");
const requireAuth = require("../utils/requireAuth");

// Get user's cart
router.get("/", requireAuth, async (req, res) => {
  try {
    console.log("Getting cart for user:", req.user.id);

    let cart = await Cart.findOne({ user: req.user.id }).populate({
      path: "items.course",
      select: "title description price thumbnailUrl instructor",
    });

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
      console.log("Created new cart for user:", req.user.id);
    }

    console.log("Cart found:", cart);
    res.json(cart);
  } catch (error) {
    console.error("Error getting cart:", error);
    res.status(500).json({ message: error.message });
  }
});

// Add course to cart
router.post("/add", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.body;
    console.log("Adding course to cart:", courseId, "for user:", req.user.id);

    if (!courseId) {
      return res.status(400).json({ message: "Course ID is required" });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      console.log("Course not found:", courseId);
      return res.status(404).json({ message: "Course not found" });
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      console.log("Created new cart for user:", req.user.id);
    }

    // Check if course already in cart
    const existingItem = cart.items.find(
      (item) => item.course.toString() === courseId
    );

    if (existingItem) {
      console.log("Course already in cart:", courseId);
      return res.status(400).json({ message: "Course already in cart" });
    }

    cart.items.push({ course: courseId });
    console.log("Added course to cart:", courseId);

    // Recalculate totals
    await calculateCartTotals(cart);
    await cart.save();

    res.json({ message: "Course added to cart", cart });
  } catch (error) {
    console.error("Error adding course to cart:", error);
    res.status(500).json({ message: error.message });
  }
});

// Remove course from cart
router.delete("/remove/:courseId", requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    console.log(
      "Removing course from cart:",
      courseId,
      "for user:",
      req.user.id
    );

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => item.course.toString() !== courseId
    );
    console.log("Removed course from cart:", courseId);

    // Recalculate totals
    await calculateCartTotals(cart);
    await cart.save();

    res.json({ message: "Course removed from cart", cart });
  } catch (error) {
    console.error("Error removing course from cart:", error);
    res.status(500).json({ message: error.message });
  }
});

// Apply coupon code with first-time purchase check
router.post("/apply-coupon", requireAuth, async (req, res) => {
  try {
    const { couponCode } = req.body;
    console.log("Applying coupon:", couponCode, "for user:", req.user.id);

    if (!couponCode) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    let cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.course"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Find coupon
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      console.log("Coupon not found:", couponCode);
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    // Check if coupon is expired
    if (coupon.validUntil && new Date() > coupon.validUntil) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    // Check if coupon usage limit exceeded
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ message: "Coupon usage limit exceeded" });
    }

    // Check minimum purchase
    const totalBeforeDiscount = cart.items.reduce(
      (sum, item) => sum + (item.course.price || 0),
      0
    );
    if (
      coupon.minimumPurchase &&
      totalBeforeDiscount < coupon.minimumPurchase
    ) {
      return res.status(400).json({
        message: `Minimum purchase of ₹${coupon.minimumPurchase} required`,
      });
    }

    // For first-time purchase coupons, check if user has made purchases before
    if (coupon.code === "WELCOME40" || coupon.code === "NEWUSER40") {
      // Check if this is user's first purchase
      const hasPreviousPurchases = await Cart.findOne({
        user: req.user.id,
        "items.0": { $exists: true },
        _id: { $ne: cart._id }, // Exclude current cart
      });

      if (hasPreviousPurchases) {
        console.log(
          "User has previous purchases, cannot use first-time coupon"
        );
        return res.status(400).json({
          message: "This coupon is only valid for first-time purchases",
        });
      }
    }

    // Apply discount
    cart.couponCode = coupon.code;
    cart.discountPercentage = coupon.discountPercentage;

    await calculateCartTotals(cart);
    await cart.save();

    console.log("Coupon applied successfully:", coupon.code);

    res.json({
      message: "Coupon applied successfully",
      cart,
      discountAmount: cart.totalBeforeDiscount - cart.totalAfterDiscount,
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({ message: error.message });
  }
});

// Remove coupon
router.delete("/remove-coupon", requireAuth, async (req, res) => {
  try {
    console.log("Removing coupon for user:", req.user.id);

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    cart.couponCode = null;
    cart.discountPercentage = 0;

    await calculateCartTotals(cart);
    await cart.save();

    console.log("Coupon removed successfully");

    res.json({ message: "Coupon removed", cart });
  } catch (error) {
    console.error("Error removing coupon:", error);
    res.status(500).json({ message: error.message });
  }
});

// Helper function to calculate cart totals
async function calculateCartTotals(cart) {
  const populatedCart = await cart.populate("items.course");

  cart.totalBeforeDiscount = populatedCart.items.reduce((sum, item) => {
    return sum + (item.course.price || 0) * (item.quantity || 1);
  }, 0);

  const discountAmount =
    (cart.totalBeforeDiscount * cart.discountPercentage) / 100;
  cart.totalAfterDiscount = cart.totalBeforeDiscount - discountAmount;

  console.log("Calculated totals:", {
    totalBeforeDiscount: cart.totalBeforeDiscount,
    discountPercentage: cart.discountPercentage,
    totalAfterDiscount: cart.totalAfterDiscount,
  });
}

module.exports = router;
