import { Request, Response, NextFunction } from 'express';
import { TagsService } from './tags.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

export class TagsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const tags = await TagsService.listUserTags(req.user!.id);
      return sendSuccess(res, tags);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tag = await TagsService.createTag(req.user!.id, req.body);
      return sendCreated(res, tag);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await TagsService.deleteTag(req.user!.id, req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async attach(req: Request, res: Response, next: NextFunction) {
    try {
      const { userMovieId, tagId } = req.body;
      await TagsService.attachTagToMovie(userMovieId, tagId);
      return sendSuccess(res, undefined, 'Tag attached');
    } catch (err) {
      next(err);
    }
  }

  static async detach(req: Request, res: Response, next: NextFunction) {
    try {
      const { userMovieId, tagId } = req.body;
      await TagsService.detachTagFromMovie(userMovieId, tagId);
      return sendSuccess(res, undefined, 'Tag detached');
    } catch (err) {
      next(err);
    }
  }
}
