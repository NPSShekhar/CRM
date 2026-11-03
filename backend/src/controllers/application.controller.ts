import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ApplicationService } from '../services/application.service.js';
import { sendSuccess } from '../utils/response.js';

export class ApplicationController {
  static async list(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const apps = await ApplicationService.listApplications();
      sendSuccess(res, apps, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const app = await ApplicationService.getApplicationById(req.params.id);
      sendSuccess(res, app, 200);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const app = await ApplicationService.createApplication(req.body, req.user?.id);
      sendSuccess(res, app, 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const app = await ApplicationService.updateApplication(req.params.id, req.body, req.user?.id);
      sendSuccess(res, app, 200);
    } catch (error) {
      next(error);
    }
  }
}
