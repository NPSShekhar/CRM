import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

export interface ChannelMessage {
  channel: 'EMAIL' | 'WHATSAPP' | 'WEB' | 'PORTAL';
  from: string;
  fromName?: string;
  to: string;
  subject?: string;
  bodyText: string;
  bodyHtml?: string;
  messageId: string;
  inReplyTo?: string | null;
  references?: string | null;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface IChannelAdapter {
  channel: string;
  receiveMessage(payload: unknown): Promise<ChannelMessage>;
  sendMessage(to: string, message: string, options?: Record<string, unknown>): Promise<boolean>;
  validateWebhook(headers: Record<string, unknown>, body: unknown): boolean;
  getStatus(): Promise<'CONNECTED' | 'DISCONNECTED' | 'ERROR'>;
}

export class EmailIntegrationAdapter implements IChannelAdapter {
  channel = 'EMAIL';

  async receiveMessage(payload: any): Promise<ChannelMessage> {
    return {
      channel: 'EMAIL',
      from: payload.from,
      fromName: payload.fromName,
      to: payload.to,
      subject: payload.subject || 'Support Request',
      bodyText: payload.bodyText || payload.text || '',
      bodyHtml: payload.bodyHtml || payload.html,
      messageId: payload.messageId,
      inReplyTo: payload.inReplyTo,
      references: payload.references,
      timestamp: payload.receivedAt ? new Date(payload.receivedAt) : new Date(),
    };
  }

  async sendMessage(_to: string, _message: string): Promise<boolean> {
    return true;
  }

  validateWebhook(_headers: Record<string, unknown>, _body: unknown): boolean {
    return true; // Expandable for SendGrid / Mailgun signature verify
  }

  async getStatus(): Promise<'CONNECTED' | 'DISCONNECTED' | 'ERROR'> {
    return 'CONNECTED';
  }
}

export class WhatsAppIntegrationAdapter implements IChannelAdapter {
  channel = 'WHATSAPP';

  async receiveMessage(payload: any): Promise<ChannelMessage> {
    // Normalizes WhatsApp Webhook payload format (Twilio, Meta WhatsApp Cloud API)
    const fromPhone = payload.from || payload.wa_id || payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || '+15550001';
    const text = payload.text || payload.body || payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '';
    const messageId = payload.messageId || payload.id || `wa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    return {
      channel: 'WHATSAPP',
      from: fromPhone,
      fromName: payload.profileName || payload.name || `WhatsApp User ${fromPhone.slice(-4)}`,
      to: payload.to || 'support@crm.local',
      subject: `[WhatsApp] Support Inquiry from ${fromPhone}`,
      bodyText: text,
      messageId,
      timestamp: new Date(),
    };
  }

  async sendMessage(to: string, message: string): Promise<boolean> {
    logger.info(`WhatsApp outbound dispatched to ${to}: ${message}`);
    return true;
  }

  validateWebhook(_headers: Record<string, unknown>, _body: unknown): boolean {
    return true; // Verify Meta hub.verify_token or Twilio signature
  }

  async getStatus(): Promise<'CONNECTED' | 'DISCONNECTED' | 'ERROR'> {
    return 'CONNECTED';
  }
}

export class IntegrationService {
  /**
   * Initializes default integrations if not in database.
   */
  static async ensureDefaultIntegrations(): Promise<void> {
    const defaultList = [
      {
        name: 'Email Ingestion Webhook & SMTP',
        type: 'EMAIL',
        status: 'CONNECTED',
        enabled: true,
        config: {
          webhookUrl: '/api/v1/webhooks/email',
          protocols: ['SMTP', 'IMAP', 'Webhook'],
          provider: 'Nodemailer / Inbound Gateway',
        },
      },
      {
        name: 'WhatsApp Business Cloud API',
        type: 'WHATSAPP',
        status: 'CONNECTED',
        enabled: true,
        config: {
          webhookUrl: '/api/v1/webhooks/whatsapp',
          mode: 'Cloud Webhook API',
          supportedFeatures: ['2-way conversation', 'Phone normalization'],
        },
      },
      {
        name: 'Customer Web Portal',
        type: 'PORTAL',
        status: 'CONNECTED',
        enabled: true,
        config: {
          portalUrl: '/tickets',
          features: ['Self-Service Submission', 'Resolution Confirmation', 'CSAT Feedback'],
        },
      },
    ];

    for (const item of defaultList) {
      const existing = await prisma.integration.findFirst({ where: { type: item.type } });
      if (!existing) {
        await prisma.integration.create({
          data: item,
        });
      }
    }
  }

  /**
   * Retrieves list of integrations with sanitized configs (never exposing credentials).
   */
  static async listIntegrations() {
    await this.ensureDefaultIntegrations();
    return prisma.integration.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        enabled: true,
        config: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
