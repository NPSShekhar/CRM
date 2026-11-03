import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { TicketService } from '../services/ticket.service.js';
import { ConversationService } from '../services/conversation.service.js';
import { AssignmentService } from '../services/assignment.service.js';
import { sendSuccess } from '../utils/response.js';

export class TicketController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const {
        search,
        status,
        priority,
        applicationId,
        assignedAgentId,
        assignedTeamId,
        customerId,
        source,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder,
        scope,
      } = req.query;

      let agentFilter = assignedAgentId as string | undefined;
      let customerFilter = customerId as string | undefined;

      if (scope === 'my' && req.user?.agentId) {
        agentFilter = req.user.agentId;
      } else if (scope === 'unassigned') {
        agentFilter = 'UNASSIGNED';
      } else if (req.user?.role === 'AGENT' && !assignedAgentId && scope !== 'all') {
        agentFilter = req.user.agentId || undefined;
      }

      if (req.user?.role === 'CUSTOMER') {
        customerFilter = req.user.id;
      }

      const result = await TicketService.listTickets({
        search: search as string,
        status: status as any,
        priority: priority as any,
        applicationId: applicationId as string,
        assignedAgentId: agentFilter,
        assignedTeamId: assignedTeamId as string,
        customerId: customerFilter,
        source: source as any,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as any,
      });

      sendSuccess(res, result.tickets, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await TicketService.getTicketById(req.params.id);
      sendSuccess(res, ticket, 200);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await TicketService.createTicket(req.body, req.user?.id);
      sendSuccess(res, ticket, 201);
    } catch (error) {
      next(error);
    }
  }

  // STEP 6: Agent Acknowledges Ticket
  static async acknowledge(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await TicketService.acknowledgeTicket(req.params.id, req.user!.id);
      sendSuccess(res, ticket, 200);
    } catch (error) {
      next(error);
    }
  }

  // STEP 8: Escalate Ticket
  static async escalate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await TicketService.escalateTicket(req.params.id, req.body, req.user!.id);
      sendSuccess(res, ticket, 200);
    } catch (error) {
      next(error);
    }
  }

  // STEP 9: Resolve & Document
  static async resolve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await TicketService.resolveTicket(req.params.id, req.body, req.user!.id);
      sendSuccess(res, ticket, 200);
    } catch (error) {
      next(error);
    }
  }

  // STEP 10: Customer Confirms Resolution
  static async confirmResolution(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await TicketService.confirmResolution(req.params.id, req.user?.id);
      sendSuccess(res, ticket, 200);
    } catch (error) {
      next(error);
    }
  }

  // STEP 10 (Reopen): Customer reports issue persists
  static async reportIssuePersists(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticket = await TicketService.reportIssuePersists(req.params.id, req.body, req.user?.id);
      sendSuccess(res, ticket, 200);
    } catch (error) {
      next(error);
    }
  }

  // STEP 11: Close & Feedback
  static async submitFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const feedback = await TicketService.submitFeedback(req.params.id, req.body, req.user?.id);
      sendSuccess(res, feedback, 201);
    } catch (error) {
      next(error);
    }
  }

  // STEP 25: Visual Lifecycle Timeline
  static async getTimeline(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const timeline = await TicketService.getTicketTimeline(req.params.id);
      sendSuccess(res, timeline, 200);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const ticket = await TicketService.updateStatus(req.params.id, status, req.user?.id);
      sendSuccess(res, ticket, 200);
    } catch (error) {
      next(error);
    }
  }

  static async updatePriority(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { priority } = req.body;
      const ticket = await TicketService.updatePriority(req.params.id, priority, req.user?.id);
      sendSuccess(res, ticket, 200);
    } catch (error) {
      next(error);
    }
  }

  static async assign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { agentId, teamId, reason } = req.body;
      const ticket = await AssignmentService.manualAssign({
        ticketId: req.params.id,
        agentId,
        teamId,
        assignedById: req.user!.id,
        reason,
      });
      sendSuccess(res, ticket, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const includeInternalNotes = req.user?.role !== 'CUSTOMER';
      const messages = await ConversationService.getTicketConversation(req.params.id, includeInternalNotes);
      sendSuccess(res, messages, 200);
    } catch (error) {
      next(error);
    }
  }

  static async addMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { bodyText, bodyHtml, messageType, source, attachments } = req.body;
      const isAgent = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'ADMIN' || req.user?.role === 'AGENT';

      const message = await ConversationService.addMessage({
        ticketId: req.params.id,
        senderType: isAgent ? 'AGENT' : 'CUSTOMER',
        messageType: messageType || 'PUBLIC',
        senderUserId: isAgent ? req.user?.id : null,
        bodyText,
        bodyHtml,
        source: source || 'WEB',
        attachments,
      });

      sendSuccess(res, message, 201);
    } catch (error) {
      next(error);
    }
  }

  static async uploadAttachment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: { code: 'FILE_MISSING', message: 'No file uploaded' } });
      }

      const file = req.file;
      const publicUrl = `/uploads/${file.filename}`;

      sendSuccess(res, {
        fileName: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath: file.path,
        publicUrl,
      }, 201);
    } catch (error) {
      next(error);
    }
  }
}
