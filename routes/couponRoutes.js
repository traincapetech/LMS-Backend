const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const auth = require('../utils/requireInstructor');
const requireAuth = require('../utils/requireAuth');

// Get all coupons (admin only)
router.get('/', auth, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get available coupons for regular users
router.get('/available', requireAuth, async (req, res) => {
  try {
    const coupons = await Coupon.find({ 
      isActive: true,
      $or: [
        { validUntil: { $gt: new Date() } },
        { validUntil: null }
      ]
    }).select('code discountPercentage description');
    
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new coupon (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const {
      code,
      discountPercentage,
      description,
      validUntil,
      maxUses,
      minimumPurchase,
      applicableCourses
    } = req.body;

    if (!code || !discountPercentage) {
      return res.status(400).json({ message: 'Code and discount percentage are required' });
    }

    if (discountPercentage < 0 || discountPercentage > 100) {
      return res.status(400).json({ message: 'Discount percentage must be between 0 and 100' });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountPercentage,
      description,
      validUntil: validUntil ? new Date(validUntil) : null,
      maxUses,
      minimumPurchase,
      applicableCourses,
      createdBy: req.user.id
    });

    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update coupon (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    Object.assign(coupon, req.body);
    await coupon.save();
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete coupon (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Generate default 40% off coupon
router.post('/generate-default', auth, async (req, res) => {
  try {
    const defaultCoupons = [
      {
        code: 'WELCOME40',
        discountPercentage: 40,
        description: 'Welcome discount - 40% off for first-time purchasers',
        maxUses: 1000,
        minimumPurchase: 0
      },
      {
        code: 'NEWUSER40',
        discountPercentage: 40,
        description: 'New user special - 40% off for first-time buyers',
        maxUses: 500,
        minimumPurchase: 0
      },
      {
        code: 'SPRING40',
        discountPercentage: 40,
        description: 'Spring sale - 40% off for everyone',
        maxUses: 200,
        minimumPurchase: 0
      }
    ];

    const createdCoupons = [];
    
    for (const couponData of defaultCoupons) {
      // Check if coupon already exists
      const existingCoupon = await Coupon.findOne({ code: couponData.code });
      if (!existingCoupon) {
        const coupon = new Coupon({
          ...couponData,
          createdBy: req.user.id
        });
        await coupon.save();
        createdCoupons.push(coupon);
      }
    }

    res.json({ 
      message: 'Default coupons created successfully', 
      createdCoupons,
      totalCreated: createdCoupons.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 