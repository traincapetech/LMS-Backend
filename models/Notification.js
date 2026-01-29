const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // for fast queries by recipient
    },
    type: {
        type: String,
        enum: ['course_approved', 'course_rejected', 'course_changes', 'admin_broadcast', 'system'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    metadata: {
        courseId: mongoose.Schema.Types.ObjectId,
        pendingCourseId: mongoose.Schema.Types.ObjectId,
        actionUrl: String
    },
    read: {
        type: Boolean,
        default: false,
        index: true // for unread count queries
    }
}, { timestamps: true });

// Compound indexes for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
