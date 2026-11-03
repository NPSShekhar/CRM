import { Request, Response, NextFunction } from 'express';
import { EmailService } from '../services/email.service.js';
import { IncomingEmailService } from '../services/incoming-email.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { prisma } from '../config/db.js';

export class EmailController {
  /**
   * Manual inbox check / sync endpoint
   * POST /api/v1/email/sync
   */
  static async syncInbox(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await IncomingEmailService.checkInboxOnce();
      sendSuccess(res, {
        message: 'Inbox sync completed',
        ...result,
      }, 200);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Endpoint to receive incoming emails from webhook providers (Mailgun, SendGrid, Postmark, AWS SES, or IMAP worker).
   */
  static async handleIncomingEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmailService.processIncomingEmail(req.body);
      const ticket: any = result.ticket;

      if (result.isDuplicate) {
        return sendSuccess(res, {
          message: 'Email already processed (idempotent)',
          ticketNumber: ticket?.ticketNumber,
          isDuplicate: true,
          ticketId: ticket?.id,
          customerName: ticket?.customer?.name,
          applicationName: ticket?.application?.name,
          status: ticket?.status,
          assignedAgent: ticket?.assignedAgent?.user?.name || null,
          threadStatus: 'Existing Thread',
        }, 200);
      }

      sendSuccess(res, {
        message: result.isNewTicket ? 'New ticket created from email (Unassigned)' : 'Reply appended to existing ticket thread',
        ticketNumber: ticket?.ticketNumber,
        isNewTicket: result.isNewTicket,
        ticketId: ticket?.id,
        customerName: ticket?.customer?.name,
        applicationName: ticket?.application?.name,
        status: ticket?.status,
        assignedAgent: ticket?.assignedAgent?.user?.name || null,
        threadStatus: result.isNewTicket ? 'Created' : 'Updated',
      }, 201);
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Retries a failed email delivery by EmailMessage id.
   */
  static async retryEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmailService.retryFailedEmail(req.params.id);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, 400, 'EMAIL_RETRY_FAILED', error.message || 'Failed to retry email delivery');
    }
  }

  /**
   * Retries a failed email delivery for a specific ticket message:
   * POST /api/v1/tickets/:ticketId/messages/:messageId/retry
   */
  static async retryTicketMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketId, messageId } = req.params;
      const result = await EmailService.retryTicketMessageEmail(ticketId, messageId);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, 400, 'EMAIL_RETRY_FAILED', error.message || 'Failed to retry email delivery');
    }
  }

  /**
   * Development or Admin test email endpoint.
   * POST /api/v1/test/email or POST /api/v1/email/test
   */
  static async testEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const recipient = req.body.to || req.body.email || (req as any).user?.email || 'test@example.com';
      const result = await EmailService.testEmailConnection(recipient);
      if (result.success) {
        sendSuccess(res, {
          message: `Test email successfully sent to ${recipient}`,
          messageId: result.messageId,
        }, 200);
      } else {
        sendError(res, 500, 'TEST_EMAIL_FAILED', result.error || 'Failed to send test email');
      }
    } catch (error: any) {
      sendError(res, 500, 'TEST_EMAIL_FAILED', error.message || 'Failed to send test email');
    }
  }

  /**
   * General-purpose send endpoint.
   */
  static async sendEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { ticketId, to, subject, bodyText, bodyHtml, attachments } = req.body;
      if (ticketId) {
        const ticket = await EmailService.getTicketForEmail(ticketId);
        if (!ticket) {
          return sendError(res, 404, 'TICKET_NOT_FOUND', 'Ticket not found');
        }

        let messageRecord: any;
        if (req.body.ticketMessageId) {
          messageRecord = await prisma.ticketMessage.findUnique({
            where: { id: req.body.ticketMessageId },
          });
        }

        if (!messageRecord) {
          messageRecord = await prisma.ticketMessage.create({
            data: {
              ticketId: ticket.id,
              senderType: 'AGENT',
              senderUserId: (req as any).user?.id || null,
              messageType: 'PUBLIC',
              bodyText: bodyText || '',
              bodyHtml: bodyHtml || null,
              source: 'EMAIL',
              direction: 'OUTBOUND',
            },
          });
        }

        const emailResult = await EmailService.sendOutgoingTicketEmail({
          ticket,
          message: messageRecord,
          bodyText: bodyText || '',
          bodyHtml: bodyHtml || null,
          attachments,
        });

        return sendSuccess(res, {
          message: emailResult.success ? 'Email dispatched successfully' : 'Email delivery failed (recorded for retry)',
          success: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error,
        }, emailResult.success ? 200 : 502);
      }

      // Standalone direct email dispatch
      const result = await EmailService.sendEmail({
        to,
        subject,
        text: bodyText,
        html: bodyHtml,
        attachments,
      });

      if (result.success) {
        sendSuccess(res, {
          message: 'Email sent successfully',
          messageId: result.messageId,
        }, 200);
      } else {
        sendError(res, 500, 'EMAIL_SEND_FAILED', result.error || 'Failed to send email');
      }
    } catch (error: any) {
      sendError(res, 500, 'EMAIL_SEND_FAILED', error.message || 'Failed to send email');
    }
  }
}
