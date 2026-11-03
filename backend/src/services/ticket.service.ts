import { prisma } from '../config/db.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { recordAuditLog } from '../utils/audit.js';
import { TicketPriority, TicketSource, TicketStatus } from '@prisma/client';
import { AssignmentService } from './assignment.service.js';
import { CustomerService } from './customer.service.js';
import { ClassificationService } from './classification.service.js';
import { SlaService } from './sla.service.js';
import { NotificationService } from './notification.service.js';
import { logger } from '../utils/logger.js';

export class TicketService {
  static async generateTicketNumber(): Promise<string> {
    const count = await prisma.ticket.count();
    const nextSeq = count + 1;
    return `CRM-${String(nextSeq).padStart(6, '0')}`;
  }

  static async listTickets(params: {
    search?: string;
    status?: TicketStatus | TicketStatus[];
    priority?: TicketPriority;
    applicationId?: string;
    assignedAgentId?: string;
    assignedTeamId?: string;
    customerId?: string;
    source?: TicketSource;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (params.status) {
      if (Array.isArray(params.status)) {
        where.status = { in: params.status };
      } else {
        where.status = params.status;
      }
    }

    if (params.priority) where.priority = params.priority;
    if (params.applicationId) where.applicationId = params.applicationId;
    if (params.assignedAgentId) {
      if (params.assignedAgentId === 'UNASSIGNED') {
        where.assignedAgentId = null;
      } else {
        where.assignedAgentId = params.assignedAgentId;
      }
    }
    if (params.assignedTeamId) where.assignedTeamId = params.assignedTeamId;
    if (params.customerId) where.customerId = params.customerId;
    if (params.source) where.source = params.source;

    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    const sortOrder = params.sortOrder || 'desc';
    const orderBy: any = {};
    if (params.sortBy) {
      orderBy[params.sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: {
            include: {
              memberships: {
                where: { status: 'ACTIVE' },
                include: { plan: true },
              },
            },
          },
          application: true,
          assignedAgent: {
            include: { user: true },
          },
          assignedTeam: true,
          category: true,
          feedbacks: true,
          timeEntries: {
            include: {
              agent: { include: { user: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          extraHours: {
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              messages: true,
              attachments: true,
            },
          },
        },
      }),
    ]);

    return {
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getTicketById(id: string) {
    const ticket = await prisma.ticket.findFirst({
      where: {
        OR: [{ id }, { ticketNumber: id }],
      },
      include: {
        customer: {
          include: {
            applications: {
              include: { application: true },
            },
            memberships: {
              where: { status: 'ACTIVE' },
              include: { plan: true },
            },
          },
        },
        application: true,
        category: true,
        assignedAgent: {
          include: { user: true, team: true },
        },
        assignedTeam: true,
        acknowledgedBy: true,
        escalatedBy: true,
        escalatedToTeam: true,
        resolvedBy: true,
        closedBy: true,
        reopenedBy: true,
        timeEntries: {
          orderBy: { createdAt: 'desc' },
          include: {
            agent: { include: { user: true } },
            extraHourRecord: true,
          },
        },
        extraHours: {
          orderBy: { createdAt: 'desc' },
          include: {
            agent: { include: { user: true } },
          },
        },
        feedbacks: {
          include: { customer: true },
        },
        escalations: {
          include: { escalatedBy: true, targetTeam: true },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: {
            previousAgent: { include: { user: true } },
            newAgent: { include: { user: true } },
            assignedBy: true,
          },
        },
        _count: {
          select: { messages: true, attachments: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundError(`Ticket not found`);
    }

    // Check SLA status dynamically
    if (ticket.slaDueAt && !ticket.slaBreachedAt && !ticket.resolvedAt && new Date() > ticket.slaDueAt) {
      await SlaService.checkAndMarkBreach(ticket.id);
      ticket.slaBreachedAt = new Date();
    }

    return ticket;
  }

  static async createTicket(
    data: {
      customerId?: string;
      customerEmail?: string;
      customerName?: string;
      customerPhone?: string;
      applicationId: string;
      subject: string;
      description: string;
      priority?: TicketPriority;
      categoryId?: string | null;
      source?: TicketSource;
    },
    creatorUserId?: string
  ) {
    // 1. Customer Identification & Deduplication (Section 5)
    let customerId = data.customerId;
    if (!customerId && data.customerEmail) {
      const customer = await CustomerService.findOrCreateCustomer(
        data.customerEmail,
        data.customerName,
        data.applicationId
      );
      customerId = customer.id;
    }

    if (!customerId) {
      throw new BadRequestError('Either customerId or customerEmail must be provided');
    }

    // Verify application exists
    const app = await prisma.application.findUnique({
      where: { id: data.applicationId },
    });
    if (!app) {
      throw new NotFoundError(`Application not found`);
    }

    // 2. Classification & Priority (Section 6)
    const classification = ClassificationService.classify(data.subject, data.description);
    const assignedPriority = data.priority || classification.priority;

    // Find or create category
    let categoryId = data.categoryId;
    if (!categoryId) {
      const category = await prisma.ticketCategory.findFirst({
        where: { name: classification.categoryName, applicationId: app.id },
      });
      if (category) {
        categoryId = category.id;
      } else {
        const newCategory = await prisma.ticketCategory.create({
          data: {
            name: classification.categoryName,
            applicationId: app.id,
            description: `Auto-classified ${classification.categoryName} inquiries`,
          },
        });
        categoryId = newCategory.id;
      }
    }

    // 3. SLA Calculation (Section 17)
    const slaDueAt = await SlaService.calculateSlaDueAt(assignedPriority);

    // 4. Generate unique sequential ticket number
    const ticketNumber = await this.generateTicketNumber();

    // 5. Create ticket with initial conversation
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        customerId,
        applicationId: data.applicationId,
        categoryId,
        subject: data.subject.trim(),
        description: data.description.trim(),
        priority: assignedPriority,
        status: 'NEW',
        source: data.source || 'WEB',
        slaDueAt,
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

    // 6. Create initial message from customer
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        conversationId: ticket.conversation?.id,
        senderType: 'CUSTOMER',
        senderCustomerId: customerId,
        messageType: 'PUBLIC',
        bodyText: data.description.trim(),
        source: data.source || 'WEB',
        direction: 'INBOUND',
      },
    });

    // 7. Manual Assignment Model: strictly no auto-assignment.
    // Ticket remains UNASSIGNED (status: OPEN/NEW, assignedAgentId: null).
    // Notify all active Admins / Super Admins about the new ticket awaiting manual assignment.
    await NotificationService.notifyTicketCreated(ticket);

    await recordAuditLog({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'TICKET_CREATED',
      performedById: creatorUserId,
      details: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        source: ticket.source,
        priority: ticket.priority,
        category: classification.categoryName,
      },
    });

    return this.getTicketById(ticket.id);
  }

  /**
   * STEP 6: Agent Acknowledges Ticket
   */
  static async acknowledgeTicket(id: string, agentUserId: string) {
    const ticket = await this.getTicketById(id);
    const now = new Date();

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: now,
        acknowledgedById: agentUserId,
        firstResponseAt: ticket.firstResponseAt || now, // Stops first-response SLA timer!
      },
      include: {
        customer: true,
        assignedAgent: { include: { user: true } },
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'SYSTEM',
        senderUserId: agentUserId,
        messageType: 'PUBLIC',
        bodyText: `Ticket acknowledged by ${updated.assignedAgent?.user.name || 'Agent'}. Investigation started.`,
        source: 'WEB',
        direction: 'INTERNAL',
      },
    });

    await recordAuditLog({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'TICKET_ACKNOWLEDGED',
      performedById: agentUserId,
      details: { acknowledgedAt: now.toISOString() },
    });

    return updated;
  }

  /**
   * STEP 8: Escalate Ticket
   */
  static async escalateTicket(
    id: string,
    params: { reason: string; note?: string; targetTeamId?: string },
    userId: string
  ) {
    const ticket = await this.getTicketById(id);
    const now = new Date();

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'ESCALATED',
        escalatedAt: now,
        escalatedById: userId,
        escalatedToTeamId: params.targetTeamId || null,
        escalationReason: params.reason,
      },
      include: {
        customer: true,
        assignedAgent: { include: { user: true } },
        escalatedToTeam: true,
      },
    });

    await prisma.ticketEscalation.create({
      data: {
        ticketId: ticket.id,
        escalatedById: userId,
        targetTeamId: params.targetTeamId || null,
        reason: params.reason,
        note: params.note || null,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'SYSTEM',
        senderUserId: userId,
        messageType: 'PUBLIC',
        bodyText: `Ticket escalated. Reason: ${params.reason}${params.targetTeamId ? ` (Escalated to team)` : ''}`,
        source: 'WEB',
        direction: 'INTERNAL',
      },
    });

    await recordAuditLog({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'TICKET_ESCALATED',
      performedById: userId,
      details: params,
    });

    return updated;
  }

  /**
   * STEP 9: Resolve & Document
   */
  static async resolveTicket(
    id: string,
    params: { resolutionSummary: string; rootCause?: string; resolutionCategory?: string },
    userId: string
  ) {
    if (!params.resolutionSummary || params.resolutionSummary.trim().length < 5) {
      throw new BadRequestError('A detailed resolution summary is required to resolve a ticket');
    }

    const ticket = await this.getTicketById(id);
    const now = new Date();

    let slaBreachedAt = ticket.slaBreachedAt;
    if (ticket.slaDueAt && now > ticket.slaDueAt && !slaBreachedAt) {
      slaBreachedAt = ticket.slaDueAt;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'RESOLVED',
        resolvedAt: now,
        resolvedById: userId,
        resolutionSummary: params.resolutionSummary.trim(),
        rootCause: params.rootCause?.trim() || null,
        resolutionCategory: params.resolutionCategory?.trim() || null,
        slaBreachedAt,
      },
      include: {
        customer: true,
        assignedAgent: { include: { user: true } },
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'SYSTEM',
        senderUserId: userId,
        messageType: 'PUBLIC',
        bodyText: `Ticket marked as RESOLVED.\nResolution: ${params.resolutionSummary}${params.rootCause ? `\nRoot Cause: ${params.rootCause}` : ''}`,
        source: 'WEB',
        direction: 'INTERNAL',
      },
    });

    await recordAuditLog({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'TICKET_RESOLVED',
      performedById: userId,
      details: params,
    });

    return updated;
  }

  /**
   * STEP 10: Customer Confirms Resolution -> Closes Ticket
   */
  static async confirmResolution(id: string, customerId?: string) {
    const ticket = await this.getTicketById(id);
    const now = new Date();

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'CLOSED',
        customerConfirmed: true,
        customerConfirmedAt: now,
        closedAt: now,
      },
      include: {
        customer: true,
        assignedAgent: { include: { user: true } },
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'CUSTOMER',
        senderCustomerId: customerId || ticket.customerId,
        messageType: 'PUBLIC',
        bodyText: `Customer confirmed resolution. Ticket is now CLOSED.`,
        source: 'WEB',
        direction: 'INBOUND',
      },
    });

    await recordAuditLog({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'CUSTOMER_CONFIRMED_RESOLUTION',
      details: { confirmedAt: now.toISOString() },
    });

    return updated;
  }

  /**
   * STEP 10 (Reopen Path): Customer says Issue Still Exists -> returns to IN_PROGRESS
   */
  static async reportIssuePersists(id: string, params: { reason: string }, customerId?: string) {
    const ticket = await this.getTicketById(id);
    const now = new Date();

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'IN_PROGRESS',
        customerConfirmed: false,
        customerConfirmedAt: null,
        resolvedAt: null,
        reopenedAt: now,
        reopenReason: params.reason || 'Customer reported issue still persists',
        reopenCount: { increment: 1 },
      },
      include: {
        customer: true,
        assignedAgent: { include: { user: true } },
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'CUSTOMER',
        senderCustomerId: customerId || ticket.customerId,
        messageType: 'PUBLIC',
        bodyText: `Reopened by customer: Issue still exists!\nReason: ${params.reason || 'Unresolved issue'}`,
        source: 'WEB',
        direction: 'INBOUND',
      },
    });

    if (ticket.assignedAgent) {
      await prisma.notification.create({
        data: {
          userId: ticket.assignedAgent.userId,
          title: `Ticket ${ticket.ticketNumber} Reopened!`,
          message: `Customer reported issue still exists: "${params.reason || 'Unresolved'}"`,
          type: 'TICKET_REOPENED',
          link: `/tickets/${ticket.id}`,
        },
      });
    }

    await recordAuditLog({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'TICKET_REOPENED_BY_CUSTOMER',
      details: params,
    });

    return updated;
  }

  /**
   * STEP 11: Close & Customer Feedback (CSAT)
   */
  static async submitFeedback(
    id: string,
    params: { rating: number; comment?: string },
    customerId?: string
  ) {
    if (params.rating < 1 || params.rating > 5) {
      throw new BadRequestError('Rating must be between 1 and 5');
    }

    const ticket = await this.getTicketById(id);

    const feedback = await prisma.customerFeedback.create({
      data: {
        ticketId: ticket.id,
        customerId: customerId || ticket.customerId,
        agentId: ticket.assignedAgentId || null,
        rating: params.rating,
        comment: params.comment || null,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'CUSTOMER',
        senderCustomerId: customerId || ticket.customerId,
        messageType: 'PUBLIC',
        bodyText: `Customer submitted feedback: Rating ${params.rating}/5 ⭐${params.comment ? `\n"${params.comment}"` : ''}`,
        source: 'WEB',
        direction: 'INBOUND',
      },
    });

    await recordAuditLog({
      entityType: 'CustomerFeedback',
      entityId: feedback.id,
      action: 'FEEDBACK_SUBMITTED',
      details: { ticketNumber: ticket.ticketNumber, rating: params.rating },
    });

    return feedback;
  }

  /**
   * STEP 25: Ticket Timeline
   */
  static async getTicketTimeline(id: string) {
    const ticket = await this.getTicketById(id);
    const auditLogs = await prisma.auditLog.findMany({
      where: { entityType: 'Ticket', entityId: ticket.id },
      orderBy: { createdAt: 'asc' },
      include: { performedBy: true },
    });

    const milestones: {
      step: number;
      name: string;
      status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
      timestamp?: string | null;
      actor?: string | null;
      details?: any;
    }[] = [
      {
        step: 1,
        name: 'Customer Message Ingested',
        status: 'COMPLETED',
        timestamp: ticket.createdAt.toISOString(),
        actor: ticket.customer.name,
        details: { channel: ticket.source },
      },
      {
        step: 2,
        name: 'Ticket Created & Classified',
        status: 'COMPLETED',
        timestamp: ticket.createdAt.toISOString(),
        actor: 'System',
        details: { category: ticket.category?.name || 'General', priority: ticket.priority },
      },
      {
        step: 3,
        name: 'Assigned to Support Agent',
        status: ticket.assignedAgent ? 'COMPLETED' : 'CURRENT',
        timestamp: ticket.assignments[0]?.createdAt.toISOString() || null,
        actor: ticket.assignedAgent?.user.name || 'Unassigned',
      },
      {
        step: 4,
        name: 'Agent Acknowledged',
        status: ticket.acknowledgedAt
          ? 'COMPLETED'
          : ticket.assignedAgent
          ? 'CURRENT'
          : 'UPCOMING',
        timestamp: ticket.acknowledgedAt?.toISOString() || null,
        actor: ticket.acknowledgedBy?.name || null,
      },
      {
        step: 5,
        name: 'Investigation & Troubleshooting',
        status: ticket.resolvedAt || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
          ? 'COMPLETED'
          : ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING_FOR_CUSTOMER' || ticket.status === 'ESCALATED'
          ? 'CURRENT'
          : 'UPCOMING',
        timestamp: ticket.firstResponseAt?.toISOString() || null,
      },
      {
        step: 6,
        name: 'Resolution & Root Cause Documented',
        status: ticket.resolvedAt ? 'COMPLETED' : 'UPCOMING',
        timestamp: ticket.resolvedAt?.toISOString() || null,
        actor: ticket.resolvedBy?.name || null,
        details: { summary: ticket.resolutionSummary, rootCause: ticket.rootCause },
      },
      {
        step: 7,
        name: 'Customer Confirmation',
        status: ticket.customerConfirmed
          ? 'COMPLETED'
          : ticket.resolvedAt
          ? 'CURRENT'
          : 'UPCOMING',
        timestamp: ticket.customerConfirmedAt?.toISOString() || null,
        details: { confirmed: ticket.customerConfirmed, reopenCount: ticket.reopenCount },
      },
      {
        step: 8,
        name: 'Closed & CSAT Feedback',
        status: ticket.status === 'CLOSED' ? 'COMPLETED' : 'UPCOMING',
        timestamp: ticket.closedAt?.toISOString() || null,
        details: { feedback: ticket.feedbacks[0] || null },
      },
    ];

    return {
      ticketNumber: ticket.ticketNumber,
      currentStatus: ticket.status,
      milestones,
      auditLogs,
    };
  }

  static async updateStatus(id: string, status: TicketStatus, userId?: string) {
    const ticket = await this.getTicketById(id);
    const updateData: any = { status };

    if (status === 'RESOLVED' && !ticket.resolvedAt) {
      updateData.resolvedAt = new Date();
    } else if (status === 'CLOSED' && !ticket.closedAt) {
      updateData.closedAt = new Date();
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: updateData,
      include: {
        customer: true,
        assignedAgent: { include: { user: true } },
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'SYSTEM',
        senderUserId: userId || null,
        messageType: 'PUBLIC',
        bodyText: `Ticket status updated to ${status}`,
        source: 'WEB',
        direction: 'INTERNAL',
      },
    });

    await recordAuditLog({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'TICKET_STATUS_CHANGED',
      performedById: userId,
      details: { from: ticket.status, to: status },
    });

    if (status === 'RESOLVED') {
      await NotificationService.notifyTicketResolved(updated);
    } else if (['OPEN', 'IN_PROGRESS'].includes(status) && ['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      await NotificationService.notifyTicketReopened(updated);
    } else {
      await NotificationService.notifyStatusChanged(ticket, ticket.status, status, userId);
    }

    return updated;
  }

  static async updatePriority(id: string, priority: TicketPriority, userId?: string) {
    const ticket = await this.getTicketById(id);
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { priority },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: 'SYSTEM',
        senderUserId: userId || null,
        messageType: 'PUBLIC',
        bodyText: `Ticket priority changed to ${priority}`,
        source: 'WEB',
        direction: 'INTERNAL',
      },
    });

    await recordAuditLog({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'TICKET_PRIORITY_CHANGED',
      performedById: userId,
      details: { from: ticket.priority, to: priority },
    });

    await NotificationService.notifyPriorityChanged(ticket, ticket.priority, priority, userId);

    return updated;
  }
}
