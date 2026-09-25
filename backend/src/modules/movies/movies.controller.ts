import { Request, Response, NextFunction } from 'express';
import { MoviesService } from './movies.service.js';
import { BadRequestError } from '../../utils/errors.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';
import { parseInteger, parseNumber, parseBoolean } from '../../utils/query.js';
import { MovieFilters } from '../../types/index.js';

export class MoviesController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const stats = await MoviesService.getLibraryStats(userId);
      return sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const filters: MovieFilters = {
        status: req.query.status as any,
        genreId: req.query.genreId as string | undefined,
        tagId: req.query.tagId as string,
        ott: (req.query.ott || req.query.ottProvider) as string | undefined,
        language: req.query.language as string,
        yearMin: parseInteger(req.query.yearMin),
        yearMax: parseInteger(req.query.yearMax),
        runtimeMin: parseInteger(req.query.runtimeMin),
        runtimeMax: parseInteger(req.query.runtimeMax),
        ratingMin: parseNumber(req.query.ratingMin),
        ratingMax: parseNumber(req.query.ratingMax),
        personalRating: req.query.personalRating as string | undefined,
        isFavorite: parseBoolean(req.query.isFavorite),
        mediaType: (req.query.mediaType || req.query.media_type) as any,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: parseInteger(req.query.page, 1),
        limit: parseInteger(req.query.limit, 50),
      };

      const result = await MoviesService.getUserMovies(userId, filters);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userMovieId = req.params.id;
      const movie = await MoviesService.getMovieById(userId, userMovieId);
      return sendSuccess(res, movie);
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
      return sendCreated(res, movie);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userMovieId = req.params.id;
      const updated = await MoviesService.updateMovie(userId, userMovieId, req.body);
      return sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userMovieId = req.params.id;
      await MoviesService.deleteMovie(userId, userMovieId);
      return sendSuccess(res, undefined, 'Movie removed from your cinema library.');
    } catch (err) {
      next(err);
    }
  }

  static async clearAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await MoviesService.clearAllUserMovies(userId);
      return sendSuccess(res, result, 'All movies removed from your cinema library.');
    } catch (err) {
      next(err);
    }
  }

  static async getTmdbDiff(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userMovieId = req.params.id;
      const diff = await MoviesService.getTmdbRefreshDiff(userId, userMovieId);
      return sendSuccess(res, diff);
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
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async bulkAction(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await MoviesService.bulkUpdate(userId, req.body);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
