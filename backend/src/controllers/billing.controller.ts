import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { BillingService } from '../services/billing.service.js';
import { sendSuccess } from '../utils/response.js';

export class BillingController {
  static async listExtraHours(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, status, startDate, endDate, agentId, page, limit } = req.query;
      const result = await BillingService.listExtraHourRecords({
        customerId: customerId as string,
        status: status as any,
        startDate: startDate as string,
        endDate: endDate as string,
        agentId: agentId as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      sendSuccess(res, result.records, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getAccountantSummary(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const summary = await BillingService.getAccountantSummary();
      sendSuccess(res, summary, 200);
    } catch (error) {
      next(error);
    }
  }

  static async updateBillingStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, notes } = req.body;
      const result = await BillingService.updateBillingStatus({
        recordId: req.params.id,
        status,
        notes,
        performedById: req.user?.id,
      });
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  static async exportCsv(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, status, agentId } = req.query;
      const csv = await BillingService.generateCsvExport({
        customerId: customerId as string,
        status: status as any,
        agentId: agentId as string,
      });

      const filename = `extra-hours-billing-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}
