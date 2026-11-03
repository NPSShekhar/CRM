import { Response } from 'express';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/db.js';

export interface RealtimeNotificationPayload {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string | Date;
}

export class RealtimeNotificationService {
  // Map of userId -> Set of active Response streams (supports multiple browser tabs)
  private static userClients = new Map<string, Set<Response>>();
  private static heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * Initializes SSE heartbeat keep-alive
   */
  static init(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
  }

  /**
   * Stops heartbeat timer and cleans up clients
   */
  static shutdown(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const [userId, clientSet] of this.userClients.entries()) {
      for (const res of clientSet) {
        try {
          res.end();
        } catch {
          // ignore
        }
      }
    }
    this.userClients.clear();
    logger.info('[Realtime] SSE Notification Service shutdown cleanly');
  }

  /**
   * Returns count of active SSE client connections across all users.
   */
  static getActiveConnectionsCount(): number {
    let count = 0;
    for (const clientSet of this.userClients.values()) {
      count += clientSet.size;
    }
    return count;
  }

  /**
   * Registers a client SSE connection for an authenticated user.
   */
  static addClient(userId: string, res: Response): () => void {
    this.init();

    if (!this.userClients.has(userId)) {
      this.userClients.set(userId, new Set());
    }
    const clientSet = this.userClients.get(userId)!;
    clientSet.add(res);

    logger.debug(`[Realtime] User ${userId} connected to SSE stream. Total tabs for user: ${clientSet.size}`);

    // Send initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', userId, timestamp: new Date().toISOString() })}\n\n`);

    const cleanup = () => {
      const currentSet = this.userClients.get(userId);
      if (currentSet) {
        currentSet.delete(res);
        if (currentSet.size === 0) {
          this.userClients.delete(userId);
        }
      }
      logger.debug(`[Realtime] User ${userId} disconnected from SSE stream.`);
    };

    return cleanup;
  }

  /**
   * Pushes a notification event to all active sessions/tabs of a specific user.
   */
  static sendNotificationToUser(userId: string, notification: RealtimeNotificationPayload): void {
    const clientSet = this.userClients.get(userId);
    if (!clientSet || clientSet.size === 0) {
      return;
    }

    const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;

    for (const res of clientSet) {
      try {
        res.write(payload);
      } catch (err: any) {
        logger.warn(`[Realtime] Failed writing to client for user ${userId}: ${err?.message}`);
      }
    }
    logger.info(`[Realtime] Dispatched notification ${notification.type} to user ${userId} across ${clientSet.size} active tab(s)`);
  }

  /**
   * Dispatches a notification to all active Super Admins and Admins.
   */
  static async broadcastToAdmins(notification: Omit<RealtimeNotificationPayload, 'userId'>): Promise<void> {
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
        select: { id: true },
      });

      for (const admin of admins) {
        this.sendNotificationToUser(admin.id, {
          ...notification,
          userId: admin.id,
        });
      }
    } catch (err: any) {
      logger.warn(`[Realtime] Failed to broadcast notification to admins: ${err?.message}`);
    }
  }

  /**
   * Sends heartbeat ping to prevent connection timeouts across firewalls/proxies.
   */
  private static sendHeartbeat(): void {
    const comment = `: ping ${Date.now()}\n\n`;
    for (const [userId, clientSet] of this.userClients.entries()) {
      for (const res of clientSet) {
        try {
          res.write(comment);
        } catch {
          clientSet.delete(res);
        }
      }
      if (clientSet.size === 0) {
        this.userClients.delete(userId);
      }
    }
  }
}
