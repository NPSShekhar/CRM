import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AuthService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

export class AuthController {
  static async login(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const result = await AuthService.login(email, password, ipAddress);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  static async register(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.getMe(req.user!.id);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }
}
