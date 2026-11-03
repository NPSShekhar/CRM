import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { MembershipService } from '../services/membership.service.js';
import { sendSuccess } from '../utils/response.js';

export class MembershipController {
  static async listPlans(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plans = await MembershipService.listPlans();
      sendSuccess(res, plans, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getPlanById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await MembershipService.getPlanById(req.params.id);
      sendSuccess(res, plan, 200);
    } catch (error) {
      next(error);
    }
  }

  static async createPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await MembershipService.createPlan(req.body);
      sendSuccess(res, plan, 201);
    } catch (error) {
      next(error);
    }
  }

  static async updatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const plan = await MembershipService.updatePlan(req.params.id, req.body);
      sendSuccess(res, plan, 200);
    } catch (error) {
      next(error);
    }
  }

  static async assignCustomerMembership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { customerId, planId, customHours, validityDays } = req.body;
      const membership = await MembershipService.assignCustomerMembership({
        customerId,
        planId,
        customHours,
        validityDays,
        performedById: req.user?.id,
      });
      sendSuccess(res, membership, 201);
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerMemberships(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await MembershipService.getCustomerMemberships(req.params.customerId);
      sendSuccess(res, data, 200);
    } catch (error) {
      next(error);
    }
  }
}
