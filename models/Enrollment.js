const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessedLecture: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  // Payment information
  paymentId: {
    type: String,
    default: null
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'razorpay', 'upi', 'card', 'free', 'manual'],
    default: 'free'
  },
  amountPaid: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate enrollments
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

// Virtual for course details
enrollmentSchema.virtual('courseDetails', {
  ref: 'Course',
  localField: 'course',
  foreignField: '_id',
  justOne: true
});

enrollmentSchema.set('toJSON', { virtuals: true });
enrollmentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);

