import { prisma } from '../config/db.js';
import { NotFoundError } from '../utils/errors.js';
import { MessageType, SenderType, TicketSource } from '@prisma/client';
import { EmailService } from './email.service.js';
import { NotificationService } from './notification.service.js';
import { recordAuditLog } from '../utils/audit.js';

interface AddMessageParams {
  ticketId: string;
  senderType: SenderType;
  messageType?: MessageType;
  senderUserId?: string | null;
  senderCustomerId?: string | null;
  bodyText: string;
  bodyHtml?: string | null;
  source?: TicketSource;
  attachments?: {
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
    publicUrl: string;
  }[];
}

export class ConversationService {
  static async getTicketConversation(ticketId: string, includeInternalNotes = true) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const where: any = { ticketId };
    if (!includeInternalNotes) {
      where.messageType = 'PUBLIC';
    }

    return prisma.ticketMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        senderUser: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
        senderCustomer: {
          select: { id: true, name: true, email: true, customerCode: true },
        },
        attachments: true,
        emailMessage: true,
      },
    });
  }

  static async addMessage(params: AddMessageParams) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.ticketId },
      include: {
        customer: true,
        application: true,
        assignedAgent: { include: { user: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    const messageType = params.messageType || 'PUBLIC';
    const source = params.source || 'WEB';

    // 1. Create message in DB
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: params.senderType,
        messageType,
        senderUserId: params.senderUserId || null,
        senderCustomerId: params.senderCustomerId || null,
        bodyText: params.bodyText,
        bodyHtml: params.bodyHtml || null,
        source,
        attachments: params.attachments && params.attachments.length > 0 ? {
          create: params.attachments.map((att) => ({
            ticketId: ticket.id,
            fileName: att.fileName,
            originalName: att.originalName,
            mimeType: att.mimeType,
            fileSize: att.fileSize,
            storagePath: att.storagePath,
            publicUrl: att.publicUrl,
            uploadedById: params.senderUserId || null,
            uploadedByCustomerId: params.senderCustomerId || null,
          })),
        } : undefined,
      },
      include: {
        senderUser: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
        senderCustomer: {
          select: { id: true, name: true, email: true, customerCode: true },
        },
        attachments: true,
        emailMessage: true,
      },
    });

    // 2. Handle agent internal note side effects
    if (params.senderType === 'AGENT' && messageType === 'INTERNAL_NOTE' && params.senderUserId) {
      const sender = await prisma.user.findUnique({
        where: { id: params.senderUserId },
        select: { name: true },
      });
      await NotificationService.notifyInternalNote(
        ticket,
        sender?.name || 'Agent',
        params.senderUserId,
        params.bodyText
      );
    }

    // 3. Handle agent public reply side effects
    if (params.senderType === 'AGENT' && messageType === 'PUBLIC') {
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (!ticket.firstResponseAt) {
        updateData.firstResponseAt = new Date();
      }

      if (ticket.status === 'NEW' || ticket.status === 'OPEN') {
        updateData.status = 'WAITING_FOR_CUSTOMER';
      }

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: updateData,
      });

      // Dispatch outgoing email to the customer!
      // Internal notes are never sent (as ensured by the condition messageType === 'PUBLIC')
      await EmailService.sendOutgoingTicketEmail({
        ticket,
        message,
        bodyText: params.bodyText,
        bodyHtml: params.bodyHtml,
        attachments: message.attachments,
      });

      await recordAuditLog({
        entityType: 'Ticket',
        entityId: ticket.id,
        action: 'AGENT_REPLIED',
        performedById: params.senderUserId,
        details: { ticketNumber: ticket.ticketNumber },
      });
    }

    // 4. Handle customer reply side effects
    if (params.senderType === 'CUSTOMER') {
      const updateData: any = {
        updatedAt: new Date(),
      };

      // If customer replies to a waiting/resolved ticket, move back to IN_PROGRESS
      if (['WAITING_FOR_CUSTOMER', 'RESOLVED'].includes(ticket.status)) {
        updateData.status = 'IN_PROGRESS';
      }

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: updateData,
      });

      // Notify the assigned agent or Admins
      await NotificationService.notifyCustomerReply(
        ticket,
        ticket.customer.name,
        params.bodyText
      );

      await recordAuditLog({
        entityType: 'Ticket',
        entityId: ticket.id,
        action: 'CUSTOMER_REPLIED',
        details: { ticketNumber: ticket.ticketNumber },
      });
    }

    // Fetch the final message with its created emailMessage relation
    const finalMessage = await prisma.ticketMessage.findUnique({
      where: { id: message.id },
      include: {
        senderUser: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
        senderCustomer: {
          select: { id: true, name: true, email: true, customerCode: true },
        },
        attachments: true,
        emailMessage: true,
      },
    });

    return finalMessage || message;
  }
}
