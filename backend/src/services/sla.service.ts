import { prisma } from '../config/db.js';
import { TicketPriority } from '@prisma/client';
import { logger } from '../utils/logger.js';

export class SlaService {
  private static defaultSlaHours: Record<TicketPriority, { responseHours: number; resolutionHours: number }> = {
    URGENT: { responseHours: 1.0, resolutionHours: 4.0 },
    HIGH: { responseHours: 4.0, resolutionHours: 12.0 },
    MEDIUM: { responseHours: 8.0, resolutionHours: 24.0 },
    LOW: { responseHours: 24.0, resolutionHours: 48.0 },
  };

  /**
   * Initializes default SLA configurations in DB if not already present.
   */
  static async ensureDefaultConfigs(): Promise<void> {
    const priorities: TicketPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
    for (const priority of priorities) {
      const existing = await prisma.sLAConfig.findUnique({ where: { priority } });
      if (!existing) {
        const defaults = this.defaultSlaHours[priority];
        await prisma.sLAConfig.create({
          data: {
            name: `${priority} Standard SLA`,
            priority,
            firstResponseHours: defaults.responseHours,
            resolutionHours: defaults.resolutionHours,
            warningThresholdMinutes: 30,
            isActive: true,
          },
        });
      }
    }
  }

  /**
   * Calculates the resolution SLA due timestamp based on ticket priority.
   */
  static async calculateSlaDueAt(priority: TicketPriority, fromDate = new Date()): Promise<Date> {
    const config = await prisma.sLAConfig.findUnique({ where: { priority } });
    const hours = config ? config.resolutionHours : this.defaultSlaHours[priority].resolutionHours;
    return new Date(fromDate.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * Checks if a ticket has breached its resolution SLA.
   */
  static async checkAndMarkBreach(ticketId: string): Promise<boolean> {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || !ticket.slaDueAt) return false;

    // If ticket is already resolved, compare resolvedAt with slaDueAt
    if (ticket.resolvedAt) {
      if (ticket.resolvedAt > ticket.slaDueAt && !ticket.slaBreachedAt) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { slaBreachedAt: ticket.slaDueAt },
        });
        return true;
      }
      return !!ticket.slaBreachedAt;
    }

    // Active ticket: check if current time passed due date
    if (new Date() > ticket.slaDueAt && !ticket.slaBreachedAt) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { slaBreachedAt: new Date() },
      });
      logger.warn(`SLA Breach recorded for ticket ${ticket.ticketNumber}`);
      return true;
    }

    return !!ticket.slaBreachedAt;
  }
}
