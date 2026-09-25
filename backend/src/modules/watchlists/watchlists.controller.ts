import { Request, Response, NextFunction } from 'express';
import { WatchlistsService } from './watchlists.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';
import { parseInteger, parseNumber, parseBoolean } from '../../utils/query.js';

export class WatchlistsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInteger(req.query.page, 1) || 1;
      const limit = parseInteger(req.query.limit, 50) || 50;
      const rawParent = (req.query.parentId ?? req.query.parent_id) as string | undefined;
      const parentId = rawParent !== undefined ? rawParent : undefined;

      const result = await WatchlistsService.listUserWatchlists(req.user!.id, { page, limit, parentId });
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async bulkMove(req: Request, res: Response, next: NextFunction) {
    try {
      const { userMovieIds, targetWatchlistId, action, sourceWatchlistId } = req.body;
      const result = await WatchlistsService.bulkMoveMovies(
        req.user!.id,
        targetWatchlistId || null,
        userMovieIds,
        action,
        sourceWatchlistId
      );
      return sendSuccess(res, result, 'Bulk move/copy completed successfully.');
    } catch (err) {
      next(err);
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInteger(req.query.page, 1) || 1;
      const limit = parseInteger(req.query.limit, 50) || 50;
      const status = req.query.status as string | undefined;
      const mediaType = req.query.mediaType as 'all' | 'movie' | 'tv' | undefined;
      const genreId = req.query.genreId as string | undefined;
      const tagId = req.query.tagId as string | undefined;
      const ott = req.query.ott as string | undefined;
      const language = req.query.language as string | undefined;
      const ratingMin = parseNumber(req.query.ratingMin);
      const ratingMax = parseNumber(req.query.ratingMax);
      const yearMin = parseInteger(req.query.yearMin);
      const yearMax = parseInteger(req.query.yearMax);
      const isFavorite = parseBoolean(req.query.isFavorite);
      const search = req.query.search as string | undefined;
      const sortBy = req.query.sortBy as string | undefined;

      const list = await WatchlistsService.getWatchlistById(req.user!.id, req.params.id, {
        page,
        limit,
        status,
        mediaType,
        genreId,
        tagId,
        ott,
        language,
        ratingMin,
        ratingMax,
        yearMin,
        yearMax,
        isFavorite,
        search,
        sortBy,
      });
      return sendSuccess(res, list);
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await WatchlistsService.createWatchlist(req.user!.id, req.body);
      return sendCreated(res, list);
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await WatchlistsService.updateWatchlist(req.user!.id, req.params.id, req.body);
      return sendSuccess(res, updated);
    } catch (err) {
      next(err);
    }
  }

  static async clearAll(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await WatchlistsService.clearAllUserWatchlists(req.user!.id);
      return sendSuccess(res, result, 'All watchlists removed from your sanctuary.');
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await WatchlistsService.deleteWatchlist(req.user!.id, req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async addMovie(req: Request, res: Response, next: NextFunction) {
    try {
      const { userMovieId } = req.body;
      await WatchlistsService.addMovieToList(req.user!.id, req.params.id, userMovieId);
      return sendSuccess(res, undefined, 'Movie added to watchlist.');
    } catch (err) {
      next(err);
    }
  }

  static async removeMovie(req: Request, res: Response, next: NextFunction) {
    try {
      await WatchlistsService.removeMovieFromList(req.user!.id, req.params.id, req.params.userMovieId);
      return sendSuccess(res, undefined, 'Movie removed from watchlist.');
    } catch (err) {
      next(err);
    }
  }
}
