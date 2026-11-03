import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { SettingsService } from '../services/settings.service.js';
import { sendSuccess } from '../utils/response.js';

export class SettingsController {
  static async getEmailSettings(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.getEmailSettings();
      sendSuccess(res, settings, 200);
    } catch (error) {
      next(error);
    }
  }

  static async updateEmailSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.updateEmailSettings(req.body, req.user?.id);
      sendSuccess(res, settings, 200);
    } catch (error) {
      next(error);
    }
  }

  static async testSmtp(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.testSmtpConnection(req.body);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  static async listAssignmentRules(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rules = await SettingsService.listAssignmentRules();
      sendSuccess(res, rules, 200);
    } catch (error) {
      next(error);
    }
  }

  static async createAssignmentRule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rule = await SettingsService.createAssignmentRule(req.body, req.user?.id);
      sendSuccess(res, rule, 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateAssignmentRule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const rule = await SettingsService.updateAssignmentRule(req.params.id, req.body, req.user?.id);
      sendSuccess(res, rule, 200);
    } catch (error) {
      next(error);
    }
  }

  static async deleteAssignmentRule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await SettingsService.deleteAssignmentRule(req.params.id, req.user?.id);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
