import { prisma } from '../config/db.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { recordAuditLog } from '../utils/audit.js';
import { logger } from '../utils/logger.js';

export interface LogTimeParams {
  ticketId: string;
  agentId: string;
  startTime: Date | string;
  endTime?: Date | string | null;
  durationMinutes: number;
  description: string;
  hourlyRate?: number;
  creatorUserId?: string;
}

export class SupportHoursService {
  /**
   * Log a support work session against a ticket.
   * Atomically calculates included hours consumed vs extra hours generated,
   * updates the customer's active membership, and creates billing records.
   */
  static async logTimeEntry(params: LogTimeParams) {
    const { ticketId, agentId, durationMinutes, description } = params;

    if (!durationMinutes || durationMinutes <= 0) {
      throw new BadRequestError('Duration must be greater than 0 minutes');
    }

    if (!description || description.trim().length === 0) {
      throw new BadRequestError('Work description is required');
    }

    // Verify ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        customer: true,
        assignedAgent: { include: { user: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ticket not found');
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { user: true },
    });

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    const durationHours = Math.round((durationMinutes / 60) * 100) / 100;
    const startTime = new Date(params.startTime);
    const endTime = params.endTime ? new Date(params.endTime) : new Date(startTime.getTime() + durationMinutes * 60000);

    // Run the deduction, entry creation, and extra hour billing inside a single atomic transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch active customer membership
      const activeMembership = await tx.customerMembership.findFirst({
        where: {
          customerId: ticket.customerId,
          status: 'ACTIVE',
          expiryDate: { gt: new Date() },
        },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });

      let includedHoursUsed = 0;
      let extraHoursUsed = 0;
      let rate = params.hourlyRate ?? (activeMembership?.plan?.extraHourRate ?? 1500);

      if (activeMembership && activeMembership.remainingHours > 0) {
        if (durationHours <= activeMembership.remainingHours) {
          // Entire duration is covered by included hours
          includedHoursUsed = durationHours;
          extraHoursUsed = 0;

          const updatedUsed = Math.round((activeMembership.usedHours + durationHours) * 100) / 100;
          const updatedRemaining = Math.max(0, Math.round((activeMembership.remainingHours - durationHours) * 100) / 100);

          await tx.customerMembership.update({
            where: { id: activeMembership.id },
            data: {
              usedHours: updatedUsed,
              remainingHours: updatedRemaining,
            },
          });
        } else {
          // Duration exceeds remaining included hours: partial included, remainder is EXTRA
          includedHoursUsed = activeMembership.remainingHours;
          extraHoursUsed = Math.round((durationHours - activeMembership.remainingHours) * 100) / 100;

          await tx.customerMembership.update({
            where: { id: activeMembership.id },
            data: {
              usedHours: activeMembership.totalHours,
              remainingHours: 0,
            },
          });
        }
      } else {
        // No active membership or 0 remaining hours: entire duration is EXTRA HOURS
        includedHoursUsed = 0;
        extraHoursUsed = durationHours;
      }

      // 2. Create the SupportTimeEntry record
      const timeEntry = await tx.supportTimeEntry.create({
        data: {
          ticketId: ticket.id,
          agentId: agent.id,
          customerId: ticket.customerId,
          customerMembershipId: activeMembership?.id || null,
          startTime,
          endTime,
          durationMinutes,
          durationHours,
          description: description.trim(),
          includedHoursUsed,
          extraHoursUsed,
        },
        include: {
          agent: { include: { user: true } },
          customer: true,
        },
      });

      // 3. If extra hours were used, generate ExtraHourRecord for the Accountant
      let extraRecord = null;
      if (extraHoursUsed > 0) {
        const amount = Math.round(extraHoursUsed * rate * 100) / 100;

        extraRecord = await tx.extraHourRecord.create({
          data: {
            customerId: ticket.customerId,
            ticketId: ticket.id,
            agentId: agent.id,
            timeEntryId: timeEntry.id,
            membershipId: activeMembership?.id || null,
            durationMinutes: Math.round(extraHoursUsed * 60),
            durationHours: extraHoursUsed,
            hourlyRate: rate,
            amount,
            status: 'PENDING',
            notes: `Support time logged on ${ticket.ticketNumber} exceeded included plan hours.`,
          },
        });
      }

      logger.info(
        `Logged support time: Ticket ${ticket.ticketNumber}, Agent ${agent.user.name}, ` +
        `Total: ${durationHours}h (Included: ${includedHoursUsed}h, Extra: ${extraHoursUsed}h, Rate: ₹${rate})`
      );

      return {
        timeEntry,
        extraRecord,
        includedHoursUsed,
        extraHoursUsed,
        extraAmount: extraRecord?.amount || 0,
      };
    });
  }

  /**
   * Get all logged time entries for a ticket with totals.
   */
  static async getTicketTimeEntries(ticketId: string) {
    const entries = await prisma.supportTimeEntry.findMany({
      where: { ticketId },
      include: {
        agent: { include: { user: true } },
        extraHourRecord: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalMinutes = entries.reduce((acc, e) => acc + e.durationMinutes, 0);
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    const includedHoursUsed = Math.round(entries.reduce((acc, e) => acc + e.includedHoursUsed, 0) * 100) / 100;
    const extraHoursUsed = Math.round(entries.reduce((acc, e) => acc + e.extraHoursUsed, 0) * 100) / 100;
    const extraCharges = entries.reduce((acc, e) => acc + (e.extraHourRecord?.amount || 0), 0);

    return {
      entries,
      totalMinutes,
      totalHours,
      includedHoursUsed,
      extraHoursUsed,
      extraCharges,
    };
  }

  /**
   * Get overall customer support hours summary (included, used, remaining, extra).
   */
  static async getCustomerSupportSummary(customerId: string) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) throw new NotFoundError('Customer not found');

    const activeMembership = customer.memberships[0] || null;

    const [allEntries, extraRecords] = await Promise.all([
      prisma.supportTimeEntry.findMany({
        where: { customerId },
      }),
      prisma.extraHourRecord.findMany({
        where: { customerId },
      }),
    ]);

    const totalLoggedHours = Math.round(allEntries.reduce((acc, e) => acc + e.durationHours, 0) * 100) / 100;
    const totalIncludedHours = activeMembership?.totalHours || 0;
    const usedIncludedHours = activeMembership?.usedHours || 0;
    const remainingIncludedHours = activeMembership?.remainingHours || 0;
    const totalExtraHours = Math.round(extraRecords.reduce((acc, r) => acc + r.durationHours, 0) * 100) / 100;
    const totalExtraAmount = extraRecords.reduce((acc, r) => acc + r.amount, 0);

    return {
      activeMembership,
      totalLoggedHours,
      totalIncludedHours,
      usedIncludedHours,
      remainingIncludedHours,
      totalExtraHours,
      totalExtraAmount,
    };
  }
}
