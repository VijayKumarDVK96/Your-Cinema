import { Request, Response, NextFunction } from 'express';
import { TasteService } from './taste.service.js';
import { sendSuccess } from '../../utils/response.js';

export class TasteController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await TasteService.getTasteProfile(req.user!.id);
      return sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  }
}
