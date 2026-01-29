const Notification = require('../models/Notification');
const User = require('../models/User');

// GET /api/notifications - Get my notifications (paginated)
exports.getMyNotifications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Notification.countDocuments({ recipient: req.user._id });

        res.json({
            success: true,
            notifications,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

// GET /api/notifications/unread-count - Get unread count
exports.getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient: req.user._id,
            read: false
        });

        res.json({
            success: true,
            unreadCount: count
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count',
            error: error.message
        });
    }
};

// PATCH /api/notifications/:id/read - Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            notification
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
};

// PATCH /api/notifications/read-all - Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const result = await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { read: true }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read',
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: error.message
        });
    }
};

// DELETE /api/notifications/:id - Delete notification
exports.deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user._id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.json({
            success: true,
            message: 'Notification deleted'
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message
        });
    }
};

// POST /api/notifications/broadcast - Admin broadcast (admin only)
exports.broadcastToStudents = async (req, res) => {
    try {
        const { title, message, recipientRole = 'student' } = req.body;

        if (!title || !message) {
            return res.status(400).json({
                success: false,
                message: 'Title and message are required'
            });
        }

        // Get all users with specified role, excluding the sender
        const query = recipientRole === 'all'
            ? { _id: { $ne: req.user._id } }
            : { role: recipientRole, _id: { $ne: req.user._id } };

        const users = await User.find(query).select('_id');

        // Create notifications for all matched users
        const notifications = users.map(user => ({
            recipient: user._id,
            type: 'admin_broadcast',
            title,
            message,
            read: false
        }));

        await Notification.insertMany(notifications);

        res.json({
            success: true,
            message: `Broadcast sent to ${notifications.length} users`,
            count: notifications.length
        });
    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send broadcast',
            error: error.message
        });
    }
};

// Helper function to create notification (used by other controllers)
exports.createNotification = async (recipientId, type, title, message, metadata = {}) => {
    try {
        const notification = await Notification.create({
            recipient: recipientId,
            type,
            title,
            message,
            metadata
        });
        return notification;
    } catch (error) {
        console.error('Create notification error:', error);
        throw error;
    }
};
