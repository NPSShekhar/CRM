import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ReportService } from '../services/report.service.js';
import { sendSuccess } from '../utils/response.js';

export class ReportController {
  static async getDashboardMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const metrics = await ReportService.getDashboardMetrics(req.user);
      sendSuccess(res, metrics, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getTicketReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await ReportService.getTicketReport(req.query as any);
      sendSuccess(res, report, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getAgentReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await ReportService.getAgentReport(req.query as any);
      sendSuccess(res, report, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getSLAReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await ReportService.getSLAReport(req.query as any);
      sendSuccess(res, report, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getCSATReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await ReportService.getCSATReport(req.query as any);
      sendSuccess(res, report, 200);
    } catch (error) {
      next(error);
    }
  }
}
