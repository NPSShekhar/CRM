import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class UserController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatarUrl: true,
          phone: true,
          createdAt: true,
          agentProfile: {
            select: {
              id: true,
              team: { select: { id: true, name: true } },
              isAvailable: true,
              currentLoad: true,
              maxCapacity: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      sendSuccess(res, users, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatarUrl: true,
          phone: true,
          createdAt: true,
          agentProfile: {
            include: { team: true },
          },
        },
      });

      if (!user) {
        return sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
      }

      sendSuccess(res, user, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatarUrl: true,
          phone: true,
          createdAt: true,
          agentProfile: {
            include: { team: true },
          },
        },
      });

      sendSuccess(res, user, 200);
    } catch (error) {
      next(error);
    }
  }
}
