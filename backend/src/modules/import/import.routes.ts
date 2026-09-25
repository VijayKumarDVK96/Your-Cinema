import { Router } from 'express';
import { z } from 'zod';
import { ImportController } from './import.controller.js';
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

router.post('/match', validate(matchSchema), ImportController.match);
router.post('/commit', validate(commitSchema), ImportController.commit);

export default router;
