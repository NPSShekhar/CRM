import { Request, Response, NextFunction } from 'express';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { EmailService } from '../services/email.service.js';
import { IntegrationService } from '../services/integration.service.js';
import { sendSuccess } from '../utils/response.js';

export class WebhookController {
  /**
   * Section 18: POST /api/v1/webhooks/whatsapp
   */
  static async handleWhatsAppWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await WhatsAppService.handleInboundMessage(req.body);

      if (result.isDuplicate) {
        return sendSuccess(res, {
          message: 'WhatsApp message already processed (idempotent duplicate)',
          ticketNumber: result.ticket?.ticketNumber,
          isDuplicate: true,
        }, 200);
      }

      sendSuccess(res, {
        message: result.isNewTicket ? 'New ticket created from WhatsApp' : 'Appended to existing WhatsApp ticket thread',
        ticketNumber: result.ticket.ticketNumber,
        ticketId: result.ticket.id,
        isNewTicket: result.isNewTicket,
      }, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Section 19: POST /api/v1/webhooks/email
   */
  static async handleEmailWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await EmailService.processIncomingEmail(req.body);

      if (result.isDuplicate) {
        return sendSuccess(res, {
          message: 'Email already processed (idempotent)',
          ticketNumber: result.ticket.ticketNumber,
          isDuplicate: true,
        }, 200);
      }

      sendSuccess(res, {
        message: result.isNewTicket ? 'New ticket created from email' : 'Reply appended to existing ticket thread',
        ticketNumber: result.ticket.ticketNumber,
        isNewTicket: result.isNewTicket,
        ticketId: result.ticket.id,
      }, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Section 21: GET /api/v1/integrations
   */
  static async listIntegrations(_req: Request, res: Response, next: NextFunction) {
    try {
      const integrations = await IntegrationService.listIntegrations();
      sendSuccess(res, integrations, 200);
    } catch (error) {
      next(error);
    }
  }
}
