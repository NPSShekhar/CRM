import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AgentService } from '../services/agent.service.js';
import { sendSuccess } from '../utils/response.js';

export class AgentController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { teamId } = req.query;
      const agents = await AgentService.listAgents(teamId as string);
      sendSuccess(res, agents, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const agent = await AgentService.getAgentById(req.params.id);
      sendSuccess(res, agent, 200);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const agent = await AgentService.updateAgent(req.params.id, req.body);
      sendSuccess(res, agent, 200);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const agent = await AgentService.createAgent(req.body);
      sendSuccess(res, agent, 201);
    } catch (error) {
      next(error);
    }
  }

  static async toggleStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const agent = await AgentService.toggleStatus(req.params.id, status);
      sendSuccess(res, agent, 200);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { password } = req.body;
      const result = await AgentService.resetPassword(req.params.id, password);
      sendSuccess(res, result, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getWorkload(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const workload = await AgentService.getAgentWorkloadSummary();
      sendSuccess(res, workload, 200);
    } catch (error) {
      next(error);
    }
  }
}
