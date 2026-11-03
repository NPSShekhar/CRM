import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SupportHoursService } from '../services/supportHours.service.js';
import { sendSuccess } from '../utils/response.js';

export class SupportHoursController {
  static async logTimeEntry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticketId = req.params.ticketId || req.body.ticketId;
      const { agentId, startTime, endTime, durationMinutes, description, hourlyRate } = req.body;

      const result = await SupportHoursService.logTimeEntry({
        ticketId,
        agentId: agentId || req.user?.id, // Agent can log for themselves, or admin can specify
        startTime: startTime || new Date(),
        endTime,
        durationMinutes: Number(durationMinutes),
        description,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        creatorUserId: req.user?.id,
      });

      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  static async getTicketTimeEntries(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ticketId = req.params.ticketId;
      const result = await SupportHoursService.getTicketTimeEntries(ticketId);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerSupportSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.customerId;
      const result = await SupportHoursService.getCustomerSupportSummary(customerId);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
