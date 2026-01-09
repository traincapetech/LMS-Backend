const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        trim: true,
        maxlength: 100
    },
    content: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 2000
    },
    helpful: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    reported: {
        type: Boolean,
        default: false
    },
    reportReason: {
        type: String,
        trim: true
    },
    instructorResponse: {
        content: { type: String, trim: true },
        respondedAt: { type: Date }
    }
}, {
    timestamps: true
});

// One review per user per course
reviewSchema.index({ user: 1, course: 1 }, { unique: true });

// Virtual for helpful count
reviewSchema.virtual('helpfulCount').get(function () {
    return this.helpful ? this.helpful.length : 0;
});

reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Review', reviewSchema);
