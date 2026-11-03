import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { recordAuditLog } from '../utils/audit.js';
import { CustomerService } from './customer.service.js';
import { TicketService } from './ticket.service.js';
import { WhatsAppIntegrationAdapter } from './integration.service.js';

interface WhatsAppWebhookPayload {
  from: string;
  name?: string;
  text: string;
  messageId: string;
  applicationCode?: string;
}

export class WhatsAppService {
  private static adapter = new WhatsAppIntegrationAdapter();

  static async handleInboundMessage(payload: WhatsAppWebhookPayload) {
    const rawMessage = await this.adapter.receiveMessage(payload);
    const normalizedPhone = rawMessage.from.trim();
    const messageId = rawMessage.messageId;

    logger.info(`Processing WhatsApp inbound: From=${normalizedPhone}, MessageId=${messageId}`);

    // 1. Idempotency Check: check if this messageId was already recorded in TicketMessage
    const existingMessage = await prisma.ticketMessage.findFirst({
      where: { externalMessageId: messageId },
      include: {
        ticket: {
          include: { customer: true, application: true },
        },
      },
    });

    if (existingMessage) {
      logger.warn(`WhatsApp message ${messageId} already processed (idempotent duplicate)`);
      return {
        isDuplicate: true,
        ticket: existingMessage.ticket,
      };
    }

    // 2. Identify or Create Customer by Phone Number (Section 5)
    let customer = await prisma.customer.findFirst({
      where: { phone: normalizedPhone },
    });

    // Default application (e.g. SkillBridge or by code)
    const application = await prisma.application.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    if (!application) {
      throw new Error('No active application found to route WhatsApp ticket');
    }

    if (!customer) {
      const customerCode = await CustomerService.generateCustomerCode();
      const generatedEmail = `wa.${normalizedPhone.replace(/\D/g, '')}@whatsapp.crm.local`;
      customer = await prisma.customer.create({
        data: {
          customerCode,
          name: rawMessage.fromName || `WhatsApp User ${normalizedPhone.slice(-4)}`,
          email: generatedEmail,
          phone: normalizedPhone,
          lastContactedAt: new Date(),
        },
      });

      await prisma.customerApplication.create({
        data: {
          customerId: customer.id,
          applicationId: application.id,
        },
      });
    } else {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { lastContactedAt: new Date() },
      });
    }

    // 3. Thread Detection: Check if customer has an existing open ticket
    let activeTicket = await prisma.ticket.findFirst({
      where: {
        customerId: customer.id,
        status: { in: ['NEW', 'ASSIGNED', 'ACKNOWLEDGED', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
      },
      include: {
        assignedAgent: { include: { user: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (activeTicket) {
      // Append message to existing active ticket
      const ticketMessage = await prisma.ticketMessage.create({
        data: {
          ticketId: activeTicket.id,
          senderType: 'CUSTOMER',
          senderCustomerId: customer.id,
          messageType: 'PUBLIC',
          bodyText: rawMessage.bodyText,
          source: 'WHATSAPP',
          direction: 'INBOUND',
          externalMessageId: messageId,
        },
      });

      await prisma.ticket.update({
        where: { id: activeTicket.id },
        data: {
          updatedAt: new Date(),
          status: activeTicket.status === 'WAITING_FOR_CUSTOMER' ? 'IN_PROGRESS' : activeTicket.status,
        },
      });

      if (activeTicket.assignedAgent) {
        await prisma.notification.create({
          data: {
            userId: activeTicket.assignedAgent.userId,
            title: `WhatsApp message on ${activeTicket.ticketNumber}`,
            message: `${customer.name} sent: "${rawMessage.bodyText.slice(0, 80)}"`,
            type: 'CUSTOMER_REPLIED',
            link: `/tickets/${activeTicket.id}`,
          },
        });
      }

      await recordAuditLog({
        entityType: 'WhatsApp',
        entityId: activeTicket.id,
        action: 'WHATSAPP_MESSAGE_APPENDED',
        details: { ticketNumber: activeTicket.ticketNumber, from: normalizedPhone, messageId },
      });

      logger.info(`Appended WhatsApp message to existing ticket ${activeTicket.ticketNumber}`);
      return {
        isDuplicate: false,
        isNewTicket: false,
        ticket: activeTicket,
        messageId: ticketMessage.id,
      };
    }

    // 4. Create New Ticket (Section 4)
    const newTicket = await TicketService.createTicket({
      customerId: customer.id,
      applicationId: application.id,
      subject: `WhatsApp: ${rawMessage.bodyText.slice(0, 50)}...`,
      description: rawMessage.bodyText,
      source: 'WHATSAPP',
    });

    await recordAuditLog({
      entityType: 'WhatsApp',
      entityId: newTicket.id,
      action: 'TICKET_CREATED_FROM_WHATSAPP',
      details: { ticketNumber: newTicket.ticketNumber, from: normalizedPhone, messageId },
    });

    logger.info(`Created new ticket ${newTicket.ticketNumber} from WhatsApp`);
    return {
      isDuplicate: false,
      isNewTicket: true,
      ticket: newTicket,
    };
  }
}
