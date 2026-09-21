import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ImportService } from './import.service.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();
router.use(authenticate);

const matchSchema = z.object({
  titles: z.array(z.string()).min(1, 'Please provide at least one movie title'),
});

const movieItemSchema = z.object({
  id: z.number().optional(),
  tmdb_id: z.number().optional(),
  tmdbId: z.number().optional(),
  watch_status: z.enum(['unwatched', 'watching', 'watched']).optional(),
  watchStatus: z.enum(['unwatched', 'watching', 'watched']).optional(),
  personal_rating: z.number().min(0).max(10).nullable().optional(),
  personalRating: z.number().min(0).max(10).nullable().optional(),
  is_favorite: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  watchlist_id: z.string().optional(),
  watchlistId: z.string().optional(),
}).passthrough();

const commitSchema = z.object({
  selectedTmdbIds: z.array(z.number()).optional(),
  movies: z.array(movieItemSchema).optional(),
  items: z.array(movieItemSchema).optional(),
  watchlistId: z.string().optional(),
  newWatchlistName: z.string().optional(),
  customGenreIds: z.array(z.string()).optional(),
  watchStatus: z.enum(['unwatched', 'watching', 'watched']).optional(),
  personalRating: z.number().min(0).max(10).nullable().optional(),
  isFavorite: z.boolean().optional(),
});

router.post('/match', validate(matchSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await ImportService.matchTitles(req.body.titles);
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

router.post('/commit', validate(commitSchema), async (req: Request, res: Response, next: NextFunction) => {
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
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

export default router;
