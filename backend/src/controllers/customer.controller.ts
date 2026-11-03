import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { CustomerService } from '../services/customer.service.js';
import { sendSuccess } from '../utils/response.js';

export class CustomerController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { search, applicationId, page, limit } = req.query;
      const result = await CustomerService.listCustomers({
        search: search as string,
        applicationId: applicationId as string,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      sendSuccess(res, result.customers, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.getCustomerById(req.params.id);
      sendSuccess(res, customer, 200);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.createCustomer(req.body, req.user?.id);
      sendSuccess(res, customer, 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.updateCustomer(req.params.id, req.body, req.user?.id);
      sendSuccess(res, customer, 200);
    } catch (error) {
      next(error);
    }
  }
}
