import { Request, Response, NextFunction } from 'express';
import { TmdbService } from './tmdb.service.js';
import { BadRequestError } from '../../utils/errors.js';

export class TmdbController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.query as string;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const type = (req.query.type as 'all' | 'movie' | 'tv') || 'all';

      if (!query || query.trim().length === 0) {
        throw new BadRequestError('Search query parameter is required');
      }

      const results = await TmdbService.searchMovies(query, page, type);
      return res.status(200).json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }

  static async getDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const tmdbId = parseInt(req.params.id, 10);
      if (isNaN(tmdbId)) {
        throw new BadRequestError('Invalid TMDB ID');
      }

      const mediaType = (req.query.media_type || req.query.mediaType || req.query.type) as 'movie' | 'tv' || 'movie';
      const details = await TmdbService.getMediaDetails(tmdbId, mediaType);
      return res.status(200).json({ success: true, data: details });
    } catch (err) {
      next(err);
    }
  }

  static async getTvDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const tmdbId = parseInt(req.params.id, 10);
      if (isNaN(tmdbId)) {
        throw new BadRequestError('Invalid TMDB ID');
      }

      const details = await TmdbService.getTvDetails(tmdbId);
      return res.status(200).json({ success: true, data: details });
    } catch (err) {
      next(err);
    }
  }
}
