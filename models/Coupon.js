const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountPercentage: { type: Number, required: true, min: 0, max: 100 },
  description: { type: String },
  isActive: { type: Boolean, default: true },
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date },
  maxUses: { type: Number },
  usedCount: { type: Number, default: 0 },
  minimumPurchase: { type: Number, default: 0 },
  applicableCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema); 