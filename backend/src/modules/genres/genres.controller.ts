import { Request, Response, NextFunction } from 'express';
import { GenresService } from './genres.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

export class GenresController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await GenresService.listGenres(req.user!.id);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const created = await GenresService.createCustomGenre(req.user!.id, req.body);
      return sendCreated(res, created);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await GenresService.updateCustomGenre(req.user!.id, req.params.id, req.body);
      return sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }

  static async clearAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await GenresService.clearAllCustomGenres(req.user!.id);
      return sendSuccess(res, result, 'All custom genres removed from your sanctuary.');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await GenresService.deleteCustomGenre(req.user!.id, req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async attach(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await GenresService.attachGenreToMovie(req.body.userMovieId, req.body.genreId);
      return sendSuccess(res, result, 'Genre attached to movie.');
    } catch (err) {
      next(err);
    }
  }

  static async detach(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await GenresService.detachGenreFromMovie(req.body.userMovieId, req.body.genreId);
      return sendSuccess(res, result, 'Genre detached from movie.');
    } catch (err) {
      next(err);
    }
  }
}
