import { Request, Response, NextFunction } from 'express';
import { ImportService } from './import.service.js';
import { sendSuccess } from '../../utils/response.js';

export class ImportController {
  static async match(req: Request, res: Response, next: NextFunction) {
    try {
      const results = await ImportService.matchTitles(req.body.titles);
      return sendSuccess(res, results);
    } catch (err) {
      next(err);
    }
  }

  static async commit(req: Request, res: Response, next: NextFunction) {
    try {
      const items = req.body.movies || req.body.items || req.body.selectedTmdbIds || [];
      const results = await ImportService.commitBatch(req.user!.id, items, {
        watchlistId: req.body.watchlistId,
        newWatchlistName: req.body.newWatchlistName,
        customGenreIds: req.body.customGenreIds,
        genreId: req.body.genreId,
        genreIds: req.body.genreIds,
        watchStatus: req.body.watchStatus,
        personalRating: req.body.personalRating,
        isFavorite: req.body.isFavorite,
        providerName: req.body.providerName,
        directUrl: req.body.directUrl,
      });
      return sendSuccess(res, results);
    } catch (err) {
      next(err);
    }
  }
}
