import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { recordAuditLog } from '../utils/audit.js';
import { RealtimeNotificationService } from './realtime-notification.service.js';

export interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  link?: string | null;
}

export interface GetNotificationsOptions {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export class NotificationService {
  /**
   * Persists a notification to the database for an authenticated user.
   */
  static async createNotification(params: CreateNotificationParams) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          entityType: params.entityType || null,
          entityId: params.entityId || null,
          link: params.link || null,
          isRead: false,
        },
      });

      logger.debug(`Notification created for user ${params.userId}: ${params.type} - "${params.title}"`);

      // Push real-time event to user's connected browser tabs
      RealtimeNotificationService.sendNotificationToUser(params.userId, {
        id: notification.id,
        userId: params.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        entityType: notification.entityType,
        entityId: notification.entityId,
        link: notification.link,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      });

      return notification;
    } catch (error: any) {
      logger.error(`Failed to create notification for user ${params.userId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Retrieves notifications for a specific user with pagination and optional unread filter.
   */
  static async getUserNotifications(userId: string, options?: GetNotificationsOptions) {
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options?.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options?.unreadOnly) {
      where.isRead = false;
    }

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Returns the count of unread notifications for a user.
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Marks a single notification as read if it belongs to the user.
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Marks all notifications for a user as read.
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Deletes a single notification owned by the user.
   */
  static async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found or access denied');
    }

    return prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  // -------------------------------------------------------------
  // TRIGGER HELPERS
  // -------------------------------------------------------------

  /**
   * Notify all Admins and Super Admins when a new ticket is ingested/created.
   */
  static async notifyTicketCreated(ticket: { id: string; ticketNumber: string; subject: string; customer?: { name?: string } }) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
        select: { id: true },
      });

      const customerName = ticket.customer?.name || 'Customer';
      for (const admin of admins) {
        await this.createNotification({
          userId: admin.id,
          type: 'TICKET_CREATED',
          title: `New Ticket: ${ticket.ticketNumber}`,
          message: `New ticket "${ticket.subject}" from ${customerName} requires review and assignment.`,
          entityType: 'Ticket',
          entityId: ticket.id,
          link: `/admin/tickets/${ticket.id}`,
        });
      }
    } catch (err: any) {
      logger.warn(`Failed to dispatch TICKET_CREATED notifications: ${err.message}`);
    }
  }

  /**
   * Notify an agent when a ticket has been assigned to them.
   */
  static async notifyTicketAssigned(
    ticket: { id: string; ticketNumber: string; subject: string },
    agentUserId: string,
    assignedByName?: string
  ) {
    try {
      await this.createNotification({
        userId: agentUserId,
        type: 'TICKET_ASSIGNED',
        title: `Assigned: ${ticket.ticketNumber}`,
        message: `${assignedByName ? `${assignedByName} assigned` : 'You were assigned to'} ticket "${ticket.subject}".`,
        entityType: 'Ticket',
        entityId: ticket.id,
        link: `/agent/tickets/${ticket.id}`,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch TICKET_ASSIGNED notification: ${err.message}`);
    }
  }

  /**
   * Notify when a ticket is reassigned.
   */
  static async notifyTicketReassigned(
    ticket: { id: string; ticketNumber: string; subject: string },
    newAgentUserId: string,
    oldAgentUserId?: string | null,
    assignedByName?: string
  ) {
    try {
      // Notify new agent
      await this.createNotification({
        userId: newAgentUserId,
        type: 'TICKET_REASSIGNED',
        title: `Reassigned to you: ${ticket.ticketNumber}`,
        message: `Ticket "${ticket.subject}" was reassigned to you${assignedByName ? ` by ${assignedByName}` : ''}.`,
        entityType: 'Ticket',
        entityId: ticket.id,
        link: `/agent/tickets/${ticket.id}`,
      });

      // Notify old agent if different
      if (oldAgentUserId && oldAgentUserId !== newAgentUserId) {
        await this.createNotification({
          userId: oldAgentUserId,
          type: 'TICKET_REASSIGNED',
          title: `Reassigned: ${ticket.ticketNumber}`,
          message: `Ticket "${ticket.subject}" was reassigned to another agent${assignedByName ? ` by ${assignedByName}` : ''}.`,
          entityType: 'Ticket',
          entityId: ticket.id,
          link: `/agent/tickets/${ticket.id}`,
        });
      }
    } catch (err: any) {
      logger.warn(`Failed to dispatch TICKET_REASSIGNED notification: ${err.message}`);
    }
  }

  /**
   * Notify assigned agent (and admins if unassigned) when customer replies.
   */
  static async notifyCustomerReply(
    ticket: { id: string; ticketNumber: string; subject: string; assignedAgent?: { userId: string } | null },
    customerName: string,
    previewText?: string
  ) {
    try {
      const messageSnippet = previewText ? ` - "${previewText.slice(0, 80)}"` : '';

      if (ticket.assignedAgent?.userId) {
        await this.createNotification({
          userId: ticket.assignedAgent.userId,
          type: 'CUSTOMER_REPLY',
          title: `Customer replied: ${ticket.ticketNumber}`,
          message: `${customerName} replied to "${ticket.subject}"${messageSnippet}`,
          entityType: 'Ticket',
          entityId: ticket.id,
          link: `/agent/tickets/${ticket.id}`,
        });
      } else {
        // If unassigned, notify Admins
        const admins = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
          select: { id: true },
        });
        for (const admin of admins) {
          await this.createNotification({
            userId: admin.id,
            type: 'CUSTOMER_REPLY',
            title: `Reply on Unassigned: ${ticket.ticketNumber}`,
            message: `${customerName} replied to "${ticket.subject}"${messageSnippet}`,
            entityType: 'Ticket',
            entityId: ticket.id,
            link: `/admin/tickets/${ticket.id}`,
          });
        }
      }
    } catch (err: any) {
      logger.warn(`Failed to dispatch CUSTOMER_REPLY notification: ${err.message}`);
    }
  }

  /**
   * Notify when an internal note is added to a ticket.
   */
  static async notifyInternalNote(
    ticket: { id: string; ticketNumber: string; subject: string; assignedAgent?: { userId: string } | null },
    authorName: string,
    authorUserId: string,
    noteSnippet?: string
  ) {
    try {
      const snippet = noteSnippet ? ` "${noteSnippet.slice(0, 80)}"` : '';
      if (ticket.assignedAgent?.userId && ticket.assignedAgent.userId !== authorUserId) {
        await this.createNotification({
          userId: ticket.assignedAgent.userId,
          type: 'INTERNAL_NOTE',
          title: `Internal Note on ${ticket.ticketNumber}`,
          message: `${authorName} added an internal note to "${ticket.subject}":${snippet}`,
          entityType: 'Ticket',
          entityId: ticket.id,
          link: `/agent/tickets/${ticket.id}`,
        });
      }
    } catch (err: any) {
      logger.warn(`Failed to dispatch INTERNAL_NOTE notification: ${err.message}`);
    }
  }

  /**
   * Notify when ticket status changes.
   */
  static async notifyStatusChanged(
    ticket: { id: string; ticketNumber: string; subject: string; assignedAgent?: { userId: string } | null },
    oldStatus: string,
    newStatus: string,
    changedByUserId?: string
  ) {
    try {
      if (ticket.assignedAgent?.userId && ticket.assignedAgent.userId !== changedByUserId) {
        await this.createNotification({
          userId: ticket.assignedAgent.userId,
          type: 'TICKET_STATUS_CHANGED',
          title: `Status Changed: ${ticket.ticketNumber}`,
          message: `Ticket "${ticket.subject}" status changed from ${oldStatus} to ${newStatus}.`,
          entityType: 'Ticket',
          entityId: ticket.id,
          link: `/agent/tickets/${ticket.id}`,
        });
      }
    } catch (err: any) {
      logger.warn(`Failed to dispatch TICKET_STATUS_CHANGED notification: ${err.message}`);
    }
  }

  /**
   * Notify when ticket priority changes.
   */
  static async notifyPriorityChanged(
    ticket: { id: string; ticketNumber: string; subject: string; assignedAgent?: { userId: string } | null },
    oldPriority: string,
    newPriority: string,
    changedByUserId?: string
  ) {
    try {
      if (ticket.assignedAgent?.userId && ticket.assignedAgent.userId !== changedByUserId) {
        await this.createNotification({
          userId: ticket.assignedAgent.userId,
          type: 'TICKET_PRIORITY_CHANGED',
          title: `Priority Changed: ${ticket.ticketNumber}`,
          message: `Ticket "${ticket.subject}" priority changed from ${oldPriority} to ${newPriority}.`,
          entityType: 'Ticket',
          entityId: ticket.id,
          link: `/agent/tickets/${ticket.id}`,
        });
      }
    } catch (err: any) {
      logger.warn(`Failed to dispatch TICKET_PRIORITY_CHANGED notification: ${err.message}`);
    }
  }

  /**
   * Notify when a ticket is resolved.
   */
  static async notifyTicketResolved(
    ticket: { id: string; ticketNumber: string; subject: string; customerId?: string; assignedAgent?: { userId: string } | null },
    resolvedByName?: string
  ) {
    try {
      if (ticket.assignedAgent?.userId) {
        await this.createNotification({
          userId: ticket.assignedAgent.userId,
          type: 'TICKET_RESOLVED',
          title: `Ticket Resolved: ${ticket.ticketNumber}`,
          message: `Ticket "${ticket.subject}" has been marked as resolved${resolvedByName ? ` by ${resolvedByName}` : ''}.`,
          entityType: 'Ticket',
          entityId: ticket.id,
          link: `/agent/tickets/${ticket.id}`,
        });
      }

      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
        select: { id: true },
      });
      for (const admin of admins) {
        if (admin.id !== ticket.assignedAgent?.userId) {
          await this.createNotification({
            userId: admin.id,
            type: 'TICKET_RESOLVED',
            title: `Ticket Resolved: ${ticket.ticketNumber}`,
            message: `Ticket "${ticket.subject}" has been resolved${resolvedByName ? ` by ${resolvedByName}` : ''}.`,
            entityType: 'Ticket',
            entityId: ticket.id,
            link: `/admin/tickets/${ticket.id}`,
          });
        }
      }
    } catch (err: any) {
      logger.warn(`Failed to dispatch TICKET_RESOLVED notification: ${err.message}`);
    }
  }

  /**
   * Notify when a ticket is reopened.
   */
  static async notifyTicketReopened(
    ticket: { id: string; ticketNumber: string; subject: string; assignedAgent?: { userId: string } | null },
    reopenedByName?: string
  ) {
    try {
      if (ticket.assignedAgent?.userId) {
        await this.createNotification({
          userId: ticket.assignedAgent.userId,
          type: 'TICKET_REOPENED',
          title: `Ticket Reopened: ${ticket.ticketNumber}`,
          message: `Ticket "${ticket.subject}" was reopened${reopenedByName ? ` by ${reopenedByName}` : ' by customer'}.`,
          entityType: 'Ticket',
          entityId: ticket.id,
          link: `/agent/tickets/${ticket.id}`,
        });
      } else {
        const admins = await prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
          select: { id: true },
        });
        for (const admin of admins) {
          await this.createNotification({
            userId: admin.id,
            type: 'TICKET_REOPENED',
            title: `Unassigned Ticket Reopened: ${ticket.ticketNumber}`,
            message: `Ticket "${ticket.subject}" was reopened${reopenedByName ? ` by ${reopenedByName}` : ' by customer'}. Requires review.`,
            entityType: 'Ticket',
            entityId: ticket.id,
            link: `/admin/tickets/${ticket.id}`,
          });
        }
      }
    } catch (err: any) {
      logger.warn(`Failed to dispatch TICKET_REOPENED notification: ${err.message}`);
    }
  }

  /**
   * Notify Admins when an outbound email dispatch fails.
   */
  static async notifyEmailFailed(
    ticket: { id: string; ticketNumber: string; subject: string },
    recipientEmail: string,
    errorMessage: string
  ) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' },
        select: { id: true },
      });

      for (const admin of admins) {
        await this.createNotification({
          userId: admin.id,
          type: 'EMAIL_FAILED',
          title: `Email Delivery Failed: ${ticket.ticketNumber}`,
          message: `Failed to deliver email to ${recipientEmail} for ticket "${ticket.subject}": ${errorMessage}`,
          entityType: 'Ticket',
          entityId: ticket.id,
          link: `/admin/tickets/${ticket.id}`,
        });
      }
    } catch (err: any) {
      logger.warn(`Failed to dispatch EMAIL_FAILED notification: ${err.message}`);
    }
  }
}
