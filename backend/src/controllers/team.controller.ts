import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { TeamService } from '../services/team.service.js';
import { sendSuccess } from '../utils/response.js';

export class TeamController {
  static async list(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teams = await TeamService.listTeams();
      sendSuccess(res, teams, 200);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const team = await TeamService.getTeamById(req.params.id);
      sendSuccess(res, team, 200);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const team = await TeamService.createTeam(req.body);
      sendSuccess(res, team, 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const team = await TeamService.updateTeam(req.params.id, req.body);
      sendSuccess(res, team, 200);
    } catch (error) {
      next(error);
    }
  }
}
