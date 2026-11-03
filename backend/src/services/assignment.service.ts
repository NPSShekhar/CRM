import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { recordAuditLog } from '../utils/audit.js';
import { NotificationService } from './notification.service.js';

export class AssignmentService {
  /**
   * Automatically assigns a ticket to the best suitable agent based on application rules.
   */
  static async autoAssignTicket(ticketId: string): Promise<string | null> {
    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { application: true },
      });

      if (!ticket) return null;

      // 1. Check if there are active AssignmentRules configured for this application
      const rule = await prisma.assignmentRule.findFirst({
        where: {
          applicationId: ticket.applicationId,
          isActive: true,
        },
        orderBy: { priority: 'asc' },
      });

      let candidateAgents = await prisma.agent.findMany({
        where: {
          isAvailable: true,
          user: { status: 'ACTIVE' },
          ...(rule?.teamId ? { teamId: rule.teamId } : {}),
        },
        include: {
          user: true,
          _count: {
            select: {
              ticketsAssigned: {
                where: { status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] } },
              },
            },
          },
        },
      });

      // If no candidate agents in the designated team, fallback to any available agent
      if (candidateAgents.length === 0) {
        candidateAgents = await prisma.agent.findMany({
          where: {
            isAvailable: true,
            user: { status: 'ACTIVE' },
          },
          include: {
            user: true,
            _count: {
              select: {
                ticketsAssigned: {
                  where: { status: { in: ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] } },
                },
              },
            },
          },
        });
      }

      if (candidateAgents.length === 0) {
        logger.warn(`No available agents found to assign ticket ${ticket.ticketNumber}`);
        return null;
      }

      // Strategy determination
      const strategy = rule?.strategy || 'ROUND_ROBIN';
      let selectedAgent = candidateAgents[0];

      if (strategy === 'LEAST_ASSIGNED') {
        // Find agent with the smallest active load
        candidateAgents.sort((a, b) => a._count.ticketsAssigned - b._count.ticketsAssigned);
        selectedAgent = candidateAgents[0];
      } else {
        // ROUND_ROBIN: find agent who received assignment longest time ago
        const lastAssignments = await prisma.ticketAssignment.findMany({
          where: {
            newAgentId: { in: candidateAgents.map((a) => a.id) },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });

        // Map candidate agent to their most recent assignment timestamp
        const recentMap = new Map<string, number>();
        lastAssignments.forEach((assign) => {
          if (assign.newAgentId && !recentMap.has(assign.newAgentId)) {
            recentMap.set(assign.newAgentId, assign.createdAt.getTime());
          }
        });

        candidateAgents.sort((a, b) => {
          const timeA = recentMap.get(a.id) || 0;
          const timeB = recentMap.get(b.id) || 0;
          return timeA - timeB; // Earliest assigned or never assigned comes first
        });

        selectedAgent = candidateAgents[0];
      }

      // Update ticket with assigned agent
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          assignedAgentId: selectedAgent.id,
          assignedTeamId: selectedAgent.teamId || null,
          status: ticket.status === 'NEW' ? 'OPEN' : ticket.status,
        },
      });

      // Record assignment in TicketAssignment history
      await prisma.ticketAssignment.create({
        data: {
          ticketId: ticket.id,
          previousAgentId: null,
          newAgentId: selectedAgent.id,
          reason: `Auto-assigned via ${strategy} for application ${ticket.application.name}`,
        },
      });

      // Update agent load count
      await prisma.agent.update({
        where: { id: selectedAgent.id },
        data: { currentLoad: { increment: 1 } },
      });

      // Create notification for the assigned agent
      await prisma.notification.create({
        data: {
          userId: selectedAgent.userId,
          title: 'New Ticket Assigned',
          message: `Ticket ${ticket.ticketNumber}: "${ticket.subject}" has been assigned to you.`,
          type: 'TICKET_ASSIGNED',
          link: `/tickets/${ticket.id}`,
        },
      });

      await recordAuditLog({
        entityType: 'Ticket',
        entityId: ticket.id,
        action: 'TICKET_AUTO_ASSIGNED',
        details: {
          ticketNumber: ticket.ticketNumber,
          agentId: selectedAgent.id,
          agentName: selectedAgent.user.name,
          strategy,
        },
      });

      logger.info(`Ticket ${ticket.ticketNumber} auto-assigned to ${selectedAgent.user.name} (${selectedAgent.id})`);
      return selectedAgent.id;
    } catch (error) {
      logger.error('Error during auto-assignment of ticket', error, { ticketId });
      return null;
    }
  }

  static async manualAssign(params: {
    ticketId: string;
    agentId?: string | null;
    teamId?: string | null;
    assignedById: string;
    reason?: string;
  }) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: params.ticketId },
      include: { assignedAgent: { include: { user: true } } },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const previousAgentId = ticket.assignedAgentId;

    const updated = await prisma.ticket.update({
      where: { id: params.ticketId },
      data: {
        assignedAgentId: params.agentId || null,
        assignedTeamId: params.teamId || null,
        status: ticket.status === 'NEW' && params.agentId ? 'OPEN' : ticket.status,
      },
      include: {
        assignedAgent: { include: { user: true } },
        assignedTeam: true,
      },
    });

    await prisma.ticketAssignment.create({
      data: {
        ticketId: params.ticketId,
        previousAgentId,
        newAgentId: params.agentId || null,
        assignedById: params.assignedById,
        reason: params.reason || 'Manual reassignment',
      },
    });

    if (params.agentId && updated.assignedAgent) {
      const assignedByUser = await prisma.user.findUnique({
        where: { id: params.assignedById },
        select: { name: true },
      });

      if (previousAgentId && previousAgentId !== params.agentId) {
        const prevAgent = await prisma.agent.findUnique({
          where: { id: previousAgentId },
          select: { userId: true },
        });
        await NotificationService.notifyTicketReassigned(
          ticket,
          updated.assignedAgent.userId,
          prevAgent?.userId,
          assignedByUser?.name
        );
      } else {
        await NotificationService.notifyTicketAssigned(
          ticket,
          updated.assignedAgent.userId,
          assignedByUser?.name
        );
      }
    }

    await recordAuditLog({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'TICKET_MANUALLY_ASSIGNED',
      performedById: params.assignedById,
      details: {
        ticketNumber: ticket.ticketNumber,
        previousAgentId,
        newAgentId: params.agentId,
        reason: params.reason,
      },
    });

    return updated;
  }
}
