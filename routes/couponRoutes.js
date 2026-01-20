const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Course = require('../models/Course');
const PendingCourse = require('../models/PendingCourse');
const auth = require('../utils/requireInstructor');
const requireAuth = require('../utils/requireAuth');

// Get all coupons (admin/instructor only)
router.get('/', requireAuth, auth, async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });
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

// Create new coupon (admin/instructor only)
router.post('/', requireAuth, auth, async (req, res) => {
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
router.put('/:id', requireAuth, auth, async (req, res) => {
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
router.delete('/:id', requireAuth, auth, async (req, res) => {
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
router.post('/generate-default', requireAuth, auth, async (req, res) => {
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

// Validate coupon for a specific course (for course detail page Apply button)
router.post('/validate-course', requireAuth, async (req, res) => {
  try {
    const { courseId, couponCode } = req.body;

    if (!courseId || !couponCode) {
      return res.status(400).json({
        valid: false,
        message: 'Course ID and coupon code are required'
      });
    }

    // Find the course (check both Course and PendingCourse to handle ID mismatch)
    let course = await Course.findById(courseId);
    let pendingCourse = null;

    if (!course) {
      pendingCourse = await PendingCourse.findById(courseId);
      if (!pendingCourse) {
        return res.status(404).json({
          valid: false,
          message: 'Course not found'
        });
      }
    }

    // Find the coupon
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({
        valid: false,
        message: 'Invalid coupon code'
      });
    }

    // Check if coupon is expired
    if (coupon.validUntil && new Date() > coupon.validUntil) {
      return res.status(400).json({
        valid: false,
        message: 'Coupon has expired'
      });
    }

    // Check usage limits
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({
        valid: false,
        message: 'Coupon usage limit exceeded'
      });
    }

    // Check applicability (Handle Course <-> PendingCourse ID linking)
    if (coupon.applicableCourses && coupon.applicableCourses.length > 0) {
      const validIds = [courseId]; // Current ID being checked

      // If valid against Published Course, also include its Draft ID
      if (course && course.pendingCourseId) {
        validIds.push(course.pendingCourseId.toString());
      }
      // If valid against Draft Course, also include its Published ID
      if (pendingCourse && pendingCourse.courseId) {
        validIds.push(pendingCourse.courseId.toString());
      }

      const isApplicable = coupon.applicableCourses.some(id =>
        validIds.includes(id.toString())
      );

      if (!isApplicable) {
        return res.status(400).json({
          valid: false,
          message: 'This coupon is not applicable for this course'
        });
      }
    }

    // Determine price
    const coursePrice = parseFloat(course ? course.price : pendingCourse.price) || 0;

    // Check minimum purchase
    if (coupon.minimumPurchase && coursePrice < coupon.minimumPurchase) {
      return res.status(400).json({
        valid: false,
        message: `Minimum purchase of ₹${coupon.minimumPurchase} required`
      });
    }

    // Calculate discount
    const discountAmount = (coursePrice * coupon.discountPercentage) / 100;
    const discountedPrice = coursePrice - discountAmount;

    res.json({
      valid: true,
      message: 'Coupon applied successfully',
      couponCode: coupon.code,
      discountPercentage: coupon.discountPercentage,
      originalPrice: coursePrice,
      discountAmount: Math.round(discountAmount * 100) / 100,
      discountedPrice: Math.round(discountedPrice * 100) / 100,
      description: coupon.description
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ valid: false, message: error.message });
  }
});

// Get coupons for a specific course (instructor/admin)
router.get('/course/:courseId', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check course existence (Course OR PendingCourse)
    const course = await Course.findById(courseId);
    const pendingCourse = await PendingCourse.findById(courseId);

    if (!course && !pendingCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const targetCourse = course || pendingCourse;

    // Verify ownership or Admin role
    const isOwner = targetCourse.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only view coupons for your own courses' });
    }

    // Find coupons where applicableCourses array contains this courseId
    const coupons = await Coupon.find({
      applicableCourses: courseId
    }).sort({ createdAt: -1 });

    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create coupon for a specific course (Instructor creates)
router.post('/course/:courseId', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { code, discountPercentage, description, validUntil } = req.body;

    if (!code || !discountPercentage) {
      return res.status(400).json({ message: 'Code and discount percentage are required' });
    }

    // Validate percentage
    if (discountPercentage < 1 || discountPercentage > 100) {
      return res.status(400).json({ message: 'Discount percentage must be between 1 and 100' });
    }

    // Check course existence (Course OR PendingCourse)
    const course = await Course.findById(courseId);
    const pendingCourse = await PendingCourse.findById(courseId);

    if (!course && !pendingCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const targetCourse = course || pendingCourse;

    // Verify ownership or Admin role
    const isOwner = targetCourse.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only create coupons for your own courses' });
    }

    // Check duplicate code
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountPercentage,
      description: description || `${discountPercentage}% off on this course`,
      validUntil: validUntil ? new Date(validUntil) : null,
      applicableCourses: [courseId], // Lock to this course
      createdBy: req.user.id
    });

    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    console.error('Error creating course coupon:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete coupon for a specific course (Instructor deletes their own)
router.delete('/course/:courseId/:couponId', requireAuth, async (req, res) => {
  try {
    const { courseId, couponId } = req.params;

    // Check course existence (Course OR PendingCourse)
    const course = await Course.findById(courseId);
    const pendingCourse = await PendingCourse.findById(courseId);

    if (!course && !pendingCourse) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const targetCourse = course || pendingCourse;

    // Verify ownership or Admin role
    const isOwner = targetCourse.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'You can only delete coupons for your own courses' });
    }

    // Find and verify the coupon
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // Verify coupon belongs to this course
    const couponBelongsToCourse = coupon.applicableCourses.some(
      id => id.toString() === courseId
    );
    if (!couponBelongsToCourse) {
      return res.status(403).json({ message: 'This coupon does not belong to this course' });
    }

    await Coupon.findByIdAndDelete(couponId);
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting course coupon:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 