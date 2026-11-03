import nodemailer from 'nodemailer';
import { prisma } from '../config/db.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { recordAuditLog } from '../utils/audit.js';
import { CustomerService } from './customer.service.js';
import { NotificationService } from './notification.service.js';
import { ClassificationService } from './classification.service.js';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  inReplyTo?: string;
  references?: string;
  ticketId?: string;
  ticketMessageId?: string;
  attachments?: {
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
    publicUrl?: string;
  }[];
}

interface OutgoingTicketEmailParams {
  ticket: any;
  message: any;
  bodyText: string;
  bodyHtml?: string | null;
  attachments?: any[];
}

interface IncomingEmailPayload {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  messageId: string;
  inReplyTo?: string | null;
  references?: string | null;
  attachments?: {
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
    publicUrl: string;
  }[];
}

/**
 * Startup helper to verify SMTP connection.
 * Returns true if successful, false otherwise without throwing an uncaught exception.
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    const { transporter } = await EmailService.getTransporter();
    await transporter.verify();
    logger.info('SMTP connection successful (Gmail SMTP ready)');
    return true;
  } catch (error: any) {
    logger.error('SMTP connection failed', error?.message || error);
    return false;
  }
};

export class EmailService {
  /**
   * Retrieves active SMTP transporter from DB or fallback environment configuration.
   */
  static async getTransporter(): Promise<{ transporter: nodemailer.Transporter; fromEmail: string; fromName: string }> {
    const dbConfig = await prisma.emailConfiguration.findFirst({
      where: { isActive: true },
    });

    if (dbConfig && dbConfig.host) {
      const isSecure = dbConfig.port === 465;
      const transporter = nodemailer.createTransport({
        host: dbConfig.host,
        port: dbConfig.port,
        secure: isSecure,
        auth: dbConfig.username ? {
          user: dbConfig.username,
          pass: dbConfig.passwordEncrypted,
        } : undefined,
      });

      return {
        transporter,
        fromEmail: dbConfig.fromEmail,
        fromName: dbConfig.fromName,
      };
    }

    // Fallback to environment variables (Gmail SMTP port 465 SSL/TLS)
    const isSecure = Number(config.smtp.port) === 465;
    const transporter = nodemailer.createTransport({
      host: config.smtp.host || 'smtp.gmail.com',
      port: Number(config.smtp.port) || 465,
      secure: isSecure,
      auth: config.smtp.user ? {
        user: config.smtp.user,
        pass: config.smtp.password,
      } : undefined,
    });

    return {
      transporter,
      fromEmail: config.smtp.fromEmail || config.smtp.user || 'support@crm.local',
      fromName: config.smtp.fromName || 'Enterprise CRM Support',
    };
  }

  static async getTicketForEmail(ticketId: string) {
    return prisma.ticket.findFirst({
      where: {
        OR: [{ id: ticketId }, { ticketNumber: ticketId }],
      },
      include: {
        customer: true,
        application: true,
        assignedAgent: { include: { user: true } },
      },
    });
  }

  /**
   * General-purpose email sending function.
   * Handles delivery, DB tracking, failure recording, and admin notification.
   */
  static async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string; emailRecordId?: string }> {
    const { transporter, fromEmail, fromName } = await this.getTransporter();
    const generatedMessageId = `<crm-out-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@${fromEmail.split('@')[1] || 'crm.local'}>`;

    // Create EmailMessage record with PENDING status
    let emailRecord: any = null;
    try {
      emailRecord = await prisma.emailMessage.create({
        data: {
          ticketId: options.ticketId || null,
          ticketMessageId: options.ticketMessageId || null,
          direction: 'OUTBOUND',
          providerMessageId: generatedMessageId,
          messageId: generatedMessageId,
          inReplyTo: options.inReplyTo || null,
          references: options.references || null,
          fromAddress: fromEmail,
          toAddress: options.to,
          senderEmail: fromEmail,
          recipientEmail: options.to,
          subject: options.subject,
          bodyText: options.text || '',
          bodyHtml: options.html || options.text || '',
          status: 'PENDING',
        },
      });
    } catch (dbErr: any) {
      logger.warn(`Failed to create initial EmailMessage record: ${dbErr.message}`);
    }

    try {
      const sendResult = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        replyTo: options.replyTo || fromEmail,
        subject: options.subject,
        text: options.text || '',
        html: options.html || (options.text ? `<div style="font-family: sans-serif; line-height: 1.6;">${options.text.replace(/\n/g, '<br/>')}</div>` : undefined),
        messageId: generatedMessageId,
        inReplyTo: options.inReplyTo,
        references: options.references,
        attachments: options.attachments?.map((att) => ({
          filename: att.originalName || att.fileName,
          path: att.storagePath,
        })),
      });

      const actualMessageId = sendResult?.messageId || generatedMessageId;

      if (emailRecord) {
        await prisma.emailMessage.update({
          where: { id: emailRecord.id },
          data: {
            status: 'SENT',
            providerMessageId: actualMessageId,
            messageId: actualMessageId,
            sentAt: new Date(),
            failureReason: null,
            errorMessage: null,
          },
        });
      }

      logger.info(`Email successfully sent to ${options.to} (Subject: "${options.subject}")`);
      return { success: true, messageId: actualMessageId, emailRecordId: emailRecord?.id };
    } catch (error: any) {
      const errorMsg = error?.message || 'SMTP delivery failed';
      logger.error(`Failed to send email to ${options.to}: ${errorMsg}`, error);

      if (emailRecord) {
        await prisma.emailMessage.update({
          where: { id: emailRecord.id },
          data: {
            status: 'FAILED',
            failureReason: errorMsg,
            errorMessage: errorMsg,
            retryCount: { increment: 1 },
          },
        });
      }

      // If associated with a ticket, notify Admins
      if (options.ticketId) {
        const ticket = await prisma.ticket.findUnique({
          where: { id: options.ticketId },
          select: { id: true, ticketNumber: true, subject: true },
        });
        if (ticket) {
          await NotificationService.notifyEmailFailed(ticket, options.to, errorMsg);
        }
      }

      return { success: false, error: errorMsg, emailRecordId: emailRecord?.id };
    }
  }

  /**
   * Sends an outgoing email reply to the customer for a ticket.
   */
  static async sendOutgoingTicketEmail(params: OutgoingTicketEmailParams) {
    const { ticket, message, bodyText, bodyHtml, attachments } = params;

    // Build subject with CRM ticket tag [CRM-XXXXXX]
    const normalizedSubject = ticket.subject.startsWith(`[${ticket.ticketNumber}]`)
      ? ticket.subject
      : `[${ticket.ticketNumber}] ${ticket.subject}`;

    // Find the latest message ID to reference for email threading
    const lastEmail = await prisma.emailMessage.findFirst({
      where: { ticketId: ticket.id, providerMessageId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });

    const inReplyTo = lastEmail?.providerMessageId || undefined;
    const references = lastEmail?.references
      ? `${lastEmail.references} ${lastEmail.providerMessageId}`
      : lastEmail?.providerMessageId || undefined;

    const result = await this.sendEmail({
      to: ticket.customer.email,
      subject: normalizedSubject,
      text: bodyText,
      html: bodyHtml || `<div style="font-family: sans-serif; line-height: 1.6;">${bodyText.replace(/\n/g, '<br/>')}</div>`,
      inReplyTo,
      references,
      ticketId: ticket.id,
      ticketMessageId: message.id,
      attachments: attachments?.map((att: any) => ({
        fileName: att.fileName || att.originalName,
        originalName: att.originalName || att.fileName,
        mimeType: att.mimeType || 'application/octet-stream',
        fileSize: att.fileSize || 0,
        storagePath: att.storagePath,
      })),
    });

    if (result.success) {
      await recordAuditLog({
        entityType: 'Email',
        entityId: result.emailRecordId || message.id,
        action: 'EMAIL_SENT',
        details: {
          to: ticket.customer.email,
          subject: normalizedSubject,
          messageId: result.messageId,
          ticketNumber: ticket.ticketNumber,
        },
      });
    }

    return result;
  }

  /**
   * Ingests and processes incoming email.
   * Handles idempotency, thread detection, customer resolution, application identification, and NO auto-assignment.
   */
  static async processIncomingEmail(payload: IncomingEmailPayload) {
    const { from, fromName, to, subject, bodyText, bodyHtml, messageId, inReplyTo, references } = payload;
    const normalizedSender = from.toLowerCase().trim();

    logger.info(`Processing incoming email: MessageId=${messageId}, From=${normalizedSender}, Subject="${subject}"`);

    // 1. Idempotency Check: If messageId was already processed, return existing
    const existingEmail = await prisma.emailMessage.findFirst({
      where: {
        OR: [
          { providerMessageId: messageId },
          { messageId: messageId },
        ],
      },
      include: {
        ticket: {
          include: {
            customer: true,
            application: true,
            assignedAgent: { include: { user: true } },
          },
        },
      },
    });

    if (existingEmail) {
      logger.warn(`Email with Message-ID ${messageId} already processed. Skipping duplicate.`);
      return {
        isDuplicate: true,
        isNewTicket: false,
        ticket: existingEmail.ticket as any,
      };
    }

    // 2. Email Thread Detection:
    let matchedTicketId: string | null = null;

    // Method A: Check In-Reply-To header
    if (inReplyTo) {
      const parentEmail = await prisma.emailMessage.findFirst({
        where: {
          OR: [
            { providerMessageId: inReplyTo },
            { messageId: inReplyTo },
          ],
        },
      });
      if (parentEmail && parentEmail.ticketId) {
        matchedTicketId = parentEmail.ticketId;
        logger.info(`Thread matched via In-Reply-To header: ${inReplyTo} -> Ticket ${matchedTicketId}`);
      }
    }

    // Method B: Check References header
    if (!matchedTicketId && references) {
      const refIds = references.split(/\s+/).filter(Boolean);
      const parentEmail = await prisma.emailMessage.findFirst({
        where: {
          OR: [
            { providerMessageId: { in: refIds } },
            { messageId: { in: refIds } },
          ],
        },
      });
      if (parentEmail && parentEmail.ticketId) {
        matchedTicketId = parentEmail.ticketId;
        logger.info(`Thread matched via References header -> Ticket ${matchedTicketId}`);
      }
    }

    // Method C: Check Subject for CRM Ticket Number tag: [CRM-XXXXXX] or CRM-XXXXXX
    if (!matchedTicketId) {
      const match = subject.match(/CRM-(\d{6})/i);
      if (match) {
        const ticketNum = `CRM-${match[1]}`;
        const ticketByNum = await prisma.ticket.findUnique({
          where: { ticketNumber: ticketNum },
        });
        if (ticketByNum) {
          matchedTicketId = ticketByNum.id;
          logger.info(`Thread matched via Subject tag: "${subject}" -> Ticket ${ticketByNum.ticketNumber}`);
        }
      }
    }

    // If an existing ticket is matched, append message to the conversation!
    if (matchedTicketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: matchedTicketId },
        include: {
          customer: true,
          application: true,
          assignedAgent: { include: { user: true } },
        },
      });

      if (!ticket) {
        throw new Error('Matched ticket not found');
      }

      // Append customer message to the ticket conversation
      const ticketMessage = await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: 'CUSTOMER',
          senderCustomerId: ticket.customerId,
          messageType: 'PUBLIC',
          bodyText: bodyText || subject,
          bodyHtml: bodyHtml || null,
          source: 'EMAIL',
          direction: 'INBOUND',
          attachments: payload.attachments && payload.attachments.length > 0 ? {
            create: payload.attachments.map((att) => ({
              ticketId: ticket.id,
              fileName: att.fileName,
              originalName: att.originalName,
              mimeType: att.mimeType,
              fileSize: att.fileSize,
              storagePath: att.storagePath,
              publicUrl: att.publicUrl,
              uploadedByCustomerId: ticket.customerId,
            })),
          } : undefined,
        },
      });

      // Record email message entry
      await prisma.emailMessage.create({
        data: {
          ticketMessageId: ticketMessage.id,
          ticketId: ticket.id,
          customerId: ticket.customerId,
          direction: 'INBOUND',
          providerMessageId: messageId,
          messageId: messageId,
          inReplyTo: inReplyTo || null,
          references: references || null,
          fromAddress: normalizedSender,
          toAddress: to,
          senderEmail: normalizedSender,
          recipientEmail: to,
          subject,
          bodyText,
          bodyHtml: bodyHtml || bodyText,
          status: 'RECEIVED',
          receivedAt: new Date(),
        },
      });

      // Update ticket status: if waiting for customer or resolved, reopen to IN_PROGRESS
      const updateData: any = { updatedAt: new Date() };
      if (['WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'].includes(ticket.status)) {
        updateData.status = 'IN_PROGRESS';
      }

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: updateData,
      });

      // Notify assigned agent or Admins
      await NotificationService.notifyCustomerReply(
        ticket,
        fromName || ticket.customer.name || normalizedSender,
        bodyText || subject
      );

      await recordAuditLog({
        entityType: 'Email',
        entityId: ticket.id,
        action: 'EMAIL_REPLY_APPENDED',
        details: { ticketNumber: ticket.ticketNumber, messageId, from: normalizedSender },
      });

      logger.info(`Appended incoming reply to existing ticket ${ticket.ticketNumber}`);
      return {
        isDuplicate: false,
        isNewTicket: false,
        ticket,
        messageId: ticketMessage.id,
      };
    }

    // 3. New Ticket Creation:
    // Identify Application: match by supportEmail -> match by name/code in subject/body -> first active application
    let targetApplication = await prisma.application.findFirst({
      where: {
        supportEmail: { equals: to.toLowerCase().trim(), mode: 'insensitive' },
        status: 'ACTIVE',
      },
    });

    if (!targetApplication) {
      const allActiveApps = await prisma.application.findMany({ where: { status: 'ACTIVE' } });
      const fullText = `${subject} ${bodyText}`.toLowerCase();
      targetApplication = allActiveApps.find(app =>
        fullText.includes(app.name.toLowerCase()) || fullText.includes(app.code.toLowerCase())
      ) || null;
    }

    if (!targetApplication) {
      targetApplication = await prisma.application.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!targetApplication) {
      throw new Error('No active application found to assign incoming ticket');
    }

    // Customer Identification & Creation
    const customer = await CustomerService.findOrCreateCustomer(
      normalizedSender,
      fromName,
      targetApplication.id
    );

    // Dynamic Issue Classification & Priority
    const classification = ClassificationService.classify(subject, bodyText);

    // Generate unique sequential ticket number
    const count = await prisma.ticket.count();
    const ticketNumber = `CRM-${String(count + 1).padStart(6, '0')}`;

    // Create new ticket: STRICTLY UNASSIGNED (status: OPEN or NEW, assignedAgentId: null)
    // Admin manually reviews and assigns.
    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        customerId: customer.id,
        applicationId: targetApplication.id,
        subject: subject.trim(),
        description: bodyText.trim() || subject.trim(),
        priority: classification.priority || 'MEDIUM',
        status: 'OPEN',
        source: 'EMAIL',
        assignedAgentId: null,
        conversation: {
          create: {},
        },
      },
      include: {
        customer: true,
        application: true,
        conversation: true,
      },
    });

    // Create initial customer message in conversation
    const initialMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: newTicket.id,
        conversationId: newTicket.conversation?.id,
        senderType: 'CUSTOMER',
        senderCustomerId: customer.id,
        messageType: 'PUBLIC',
        bodyText: bodyText.trim() || subject.trim(),
        bodyHtml: bodyHtml || null,
        source: 'EMAIL',
        direction: 'INBOUND',
        attachments: payload.attachments && payload.attachments.length > 0 ? {
          create: payload.attachments.map((att) => ({
            ticketId: newTicket.id,
            fileName: att.fileName,
            originalName: att.originalName,
            mimeType: att.mimeType,
            fileSize: att.fileSize,
            storagePath: att.storagePath,
            publicUrl: att.publicUrl,
            uploadedByCustomerId: customer.id,
          })),
        } : undefined,
      },
    });

    // Record incoming EmailMessage
    await prisma.emailMessage.create({
      data: {
        ticketMessageId: initialMessage.id,
        ticketId: newTicket.id,
        customerId: customer.id,
        direction: 'INBOUND',
        providerMessageId: messageId,
        messageId: messageId,
        inReplyTo: inReplyTo || null,
        references: references || null,
        fromAddress: normalizedSender,
        toAddress: to,
        senderEmail: normalizedSender,
        recipientEmail: to,
        subject,
        bodyText,
        bodyHtml: bodyHtml || bodyText,
        status: 'RECEIVED',
        receivedAt: new Date(),
      },
    });

    // Notify all active Admins/SuperAdmins of the new ticket awaiting manual assignment
    await NotificationService.notifyTicketCreated(newTicket);

    await recordAuditLog({
      entityType: 'Ticket',
      entityId: newTicket.id,
      action: 'TICKET_CREATED_FROM_EMAIL',
      details: {
        ticketNumber: newTicket.ticketNumber,
        subject: newTicket.subject,
        from: normalizedSender,
        messageId,
      },
    });

    logger.info(`Created new ticket ${newTicket.ticketNumber} from email ${messageId} (Unassigned)`);

    return {
      isDuplicate: false,
      isNewTicket: true,
      ticket: newTicket as any,
      messageId: initialMessage.id,
    };
  }

  /**
   * Retries sending a failed email message by EmailMessage id.
   */
  static async retryFailedEmail(emailId: string) {
    const email = await prisma.emailMessage.findUnique({
      where: { id: emailId },
      include: {
        ticket: {
          include: { customer: true },
        },
      },
    });

    if (!email) {
      throw new Error('Email record not found');
    }

    if (email.status !== 'FAILED') {
      throw new Error(`Email is not in FAILED status (current: ${email.status})`);
    }

    try {
      const { transporter, fromEmail, fromName } = await this.getTransporter();

      const sendResult: any = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email.toAddress,
        subject: email.subject,
        text: email.bodyText || undefined,
        html: email.bodyHtml || undefined,
        messageId: email.providerMessageId || undefined,
        inReplyTo: email.inReplyTo || undefined,
        references: email.references || undefined,
      });

      const updated = await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          errorMessage: null,
          failureReason: null,
          sentAt: new Date(),
        },
      });

      if (email.ticket) {
        await recordAuditLog({
          entityType: 'Email',
          entityId: email.id,
          action: 'EMAIL_RETRY_SUCCESS',
          details: { ticketNumber: email.ticket.ticketNumber, to: email.toAddress },
        });
      }

      return { success: true, messageId: sendResult.messageId, email: updated };
    } catch (error: any) {
      const errorMsg = error?.message || 'Retry delivery failed';
      await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          retryCount: { increment: 1 },
          errorMessage: errorMsg,
          failureReason: errorMsg,
        },
      });

      if (email.ticket) {
        await NotificationService.notifyEmailFailed(email.ticket, email.toAddress, errorMsg);
      }

      throw error;
    }
  }

  /**
   * Retries sending a failed email message by ticketMessageId.
   */
  static async retryTicketMessageEmail(ticketId: string, messageId: string) {
    const email = await prisma.emailMessage.findFirst({
      where: {
        ticketId,
        ticketMessageId: messageId,
      },
      include: {
        ticket: {
          include: { customer: true },
        },
      },
    });

    if (!email) {
      // If no EmailMessage found for this message, create one or throw
      const ticketMessage = await prisma.ticketMessage.findFirst({
        where: { id: messageId, ticketId },
        include: { ticket: { include: { customer: true } } },
      });

      if (!ticketMessage) {
        throw new Error('Ticket message not found');
      }

      // Try sending now
      const result = await this.sendOutgoingTicketEmail({
        ticket: ticketMessage.ticket,
        message: ticketMessage,
        bodyText: ticketMessage.bodyText,
        bodyHtml: ticketMessage.bodyHtml,
      });

      return result;
    }

    return this.retryFailedEmail(email.id);
  }

  /**
   * Test sending an email (for development / super admin setup test).
   */
  static async testEmailConnection(toEmail: string) {
    const subject = `[CRM Test] Gmail SMTP Verification - ${new Date().toLocaleString()}`;
    const text = `This is a test email sent from Enterprise CRM via Gmail SMTP.\nIf you received this, your SMTP settings are configured properly.`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; background: #f8fafc; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 8px;">Enterprise CRM — SMTP Test</h2>
        <p style="font-size: 15px; margin: 0 0 16px 0;">This email confirms that your Gmail SMTP connection is operational.</p>
        <div style="background: #ffffff; padding: 12px 16px; border-left: 4px solid #4f46e5; border-radius: 4px; font-family: monospace; font-size: 13px;">
          Timestamp: ${new Date().toISOString()}<br/>
          Recipient: ${toEmail}<br/>
          Port: 465 (SSL/TLS)<br/>
          Status: Operational
        </div>
      </div>
    `;

    return this.sendEmail({
      to: toEmail,
      subject,
      text,
      html,
    });
  }
}
