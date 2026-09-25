import { Request, Response, NextFunction } from 'express';
import { AIService } from './ai.service.js';
import { sendSuccess } from '../../utils/response.js';

export class AIController {
  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await AIService.getSettings(req.user!.id);
      return sendSuccess(res, settings);
    } catch (err) {
      next(err);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await AIService.updateSettings(req.user!.id, req.body);
      return sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }

  static async test(req: Request, res: Response, next: NextFunction) {
    try {
      const adapter = await AIService.getAdapterForUser(req.user!.id);
      const testResult = await adapter.testConnection();
      return sendSuccess(res, testResult);
    } catch (err) {
      next(err);
    }
  }

  static async tasteSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await AIService.generateTasteSummary(req.user!.id);
      return sendSuccess(res, { summary });
    } catch (err) {
      next(err);
    }
  }

  static async explain(req: Request, res: Response, next: NextFunction) {
    try {
      const explanation = await AIService.explainRecommendation(req.user!.id, req.params.userMovieId);
      return sendSuccess(res, { explanation });
    } catch (err) {
      next(err);
    }
  }

  static async ask(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await AIService.askLibraryQuestion(req.user!.id, req.body.query);
      return sendSuccess(res, results);
    } catch (err) {
      next(err);
    }
  }
}
