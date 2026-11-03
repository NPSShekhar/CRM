import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

// Real-time SSE stream for notifications
router.get('/stream', NotificationController.stream);

// Unread count
router.get('/unread-count', NotificationController.getUnreadCount);

// List notifications (supports ?page=1&limit=20&unreadOnly=true)
router.get('/', NotificationController.list);

// Mark all as read (supports PATCH and PUT)
router.patch('/read-all', NotificationController.markAllAsRead);
router.put('/read-all', NotificationController.markAllAsRead);

// Mark single as read (supports PATCH and PUT)
router.patch('/:id/read', NotificationController.markAsRead);
router.put('/:id/read', NotificationController.markAsRead);

// Delete notification
router.delete('/:id', NotificationController.delete);

export default router;
