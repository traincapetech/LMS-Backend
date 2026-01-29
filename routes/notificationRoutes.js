const router = require('express').Router();
const requireAuth = require('../utils/requireAuth');
const requireAdmin = require('../utils/requireAdmin');
const controller = require('../controllers/notificationController');

// All routes require authentication
router.use(requireAuth);

// Public notification routes (any authenticated user)
router.get('/', controller.getMyNotifications);
router.get('/unread-count', controller.getUnreadCount);
router.patch('/:id/read', controller.markAsRead);
router.patch('/read-all', controller.markAllAsRead);
router.delete('/:id', controller.deleteNotification);

// Admin-only broadcast route
router.post('/broadcast', requireAdmin, controller.broadcastToStudents);

module.exports = router;
