import { Request, Response, NextFunction } from 'express';
import { MoviesService } from './movies.service.js';
import { BadRequestError } from '../../utils/errors.js';

export class MoviesController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const filters = {
        status: req.query.status as any,
        genreId: req.query.genreId as string | undefined,
        tagId: req.query.tagId as string,
        ott: (req.query.ott || req.query.ottProvider) as string | undefined,
        language: req.query.language as string,
        yearMin: req.query.yearMin ? parseInt(req.query.yearMin as string, 10) : undefined,
        yearMax: req.query.yearMax ? parseInt(req.query.yearMax as string, 10) : undefined,
        runtimeMin: req.query.runtimeMin ? parseInt(req.query.runtimeMin as string, 10) : undefined,
        runtimeMax: req.query.runtimeMax ? parseInt(req.query.runtimeMax as string, 10) : undefined,
        ratingMin: req.query.ratingMin ? parseFloat(req.query.ratingMin as string) : undefined,
        isFavorite: req.query.isFavorite === 'true' ? true : req.query.isFavorite === 'false' ? false : undefined,
        mediaType: (req.query.mediaType || req.query.media_type) as any,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 48,
      };

      const result = await MoviesService.getUserMovies(userId, filters);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userMovieId = req.params.id;
      const movie = await MoviesService.getMovieById(userId, userMovieId);
      return res.status(200).json({ success: true, data: movie });
    } catch (err) {
      next(err);
    }
  }

  static async add(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const tmdbId = req.body.tmdb_id;
      const mediaType = (req.body.media_type || req.body.mediaType || 'movie') as 'movie' | 'tv';
      if (!tmdbId) {
        throw new BadRequestError('tmdb_id is required');
      }

      const movie = await MoviesService.addMovie(userId, tmdbId, mediaType);
      return res.status(201).json({ success: true, data: movie });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userMovieId = req.params.id;
      const updated = await MoviesService.updateMovie(userId, userMovieId, req.body);
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userMovieId = req.params.id;
      await MoviesService.deleteMovie(userId, userMovieId);
      return res.status(200).json({ success: true, message: 'Movie removed from your cinema library.' });
    } catch (err) {
      next(err);
    }
  }

  static async clearAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await MoviesService.clearAllUserMovies(userId);
      return res.status(200).json({ success: true, message: 'All movies removed from your cinema library.', data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getTmdbDiff(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userMovieId = req.params.id;
      const diff = await MoviesService.getTmdbRefreshDiff(userId, userMovieId);
      return res.status(200).json({ success: true, data: diff });
    } catch (err) {
      next(err);
    }
  }

  static async applyTmdbRefresh(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userMovieId = req.params.id;
      const { selectedFields = [], fullOverwrite = false } = req.body;
      const result = await MoviesService.applyTmdbRefresh(userId, userMovieId, { selectedFields, fullOverwrite });
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async bulkAction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await MoviesService.bulkUpdate(userId, req.body);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}
