import { Request, Response, NextFunction } from 'express';
import { RecommendationsService } from './recommendations.service.js';
import { sendSuccess } from '../../utils/response.js';

export class RecommendationsController {
  static async getRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RecommendationsService.getRecommendations(req.user!.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async pickSomething(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RecommendationsService.pickSomethingForMe(req.user!.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
