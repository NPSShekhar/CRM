import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { NotificationService } from '../services/notification.service.js';
import { RealtimeNotificationService } from '../services/realtime-notification.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class NotificationController {
  /**
   * SSE Stream endpoint for real-time notification push to active browser tabs.
   * GET /api/v1/notifications/stream
   */
  static async stream(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const cleanup = RealtimeNotificationService.addClient(req.user!.id, res);

      req.on('close', () => {
        cleanup();
      });
    } catch (error) {
      next(error);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === '1';

      const result = await NotificationService.getUserNotifications(req.user!.id, {
        page,
        limit,
        unreadOnly,
      });

      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const count = await NotificationService.getUnreadCount(req.user!.id);
      sendSuccess(res, { count }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const notification = await NotificationService.markAsRead(req.params.id, req.user!.id);
      sendSuccess(res, notification, 200);
    } catch (error: any) {
      if (error?.message?.includes('not found')) {
        return sendError(res, 404, 'NOTIFICATION_NOT_FOUND', error.message);
      }
      next(error);
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await NotificationService.markAllAsRead(req.user!.id);
      sendSuccess(res, { success: true, count: result.count }, 200);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await NotificationService.deleteNotification(req.params.id, req.user!.id);
      sendSuccess(res, { success: true, message: 'Notification deleted' }, 200);
    } catch (error: any) {
      if (error?.message?.includes('not found')) {
        return sendError(res, 404, 'NOTIFICATION_NOT_FOUND', error.message);
      }
      next(error);
    }
  }
}
