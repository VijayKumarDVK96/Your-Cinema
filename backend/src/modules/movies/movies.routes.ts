import { Router } from 'express';
import { z } from 'zod';
import { MoviesController } from './movies.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

const updateMovieSchema = z.object({
  watch_status: z.enum(['unwatched', 'watching', 'watched']).optional(),
  personal_rating: z.number().min(0.5).max(5.0).nullable().optional(),
  is_favorite: z.boolean().optional(),
  personal_notes: z.string().nullable().optional(),
  custom_title: z.string().nullable().optional(),
  custom_overview: z.string().nullable().optional(),
  custom_poster_url: z.string().nullable().optional(),
  custom_backdrop_url: z.string().nullable().optional(),
  custom_runtime: z.number().nullable().optional(),
  custom_director: z.string().nullable().optional(),
  playback_position_sec: z.number().optional(),
  current_season: z.number().int().min(1).optional(),
  current_episode: z.number().int().min(1).optional(),
});

const bulkSchema = z.object({
  movieIds: z.array(z.string()),
  action: z.enum([
    'mark_watched',
    'mark_unwatched',
    'favorite',
    'unfavorite',
    'delete',
    'add_tag',
    'remove_tag',
    'add_genre',
    'remove_genre',
    'add_to_watchlist',
    'edit_tags_genres'
  ]),
  tagId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  genreId: z.string().optional(),
  genreIds: z.array(z.string()).optional(),
  watchlistId: z.string().optional(),
  newWatchlistName: z.string().optional(),
});

router.use(authenticate);

router.get('/', MoviesController.list);
router.post('/bulk', validate(bulkSchema), MoviesController.bulkAction);
router.delete('/clear/all', MoviesController.clearAll);
router.get('/:id', MoviesController.getOne);
router.post('/', MoviesController.add);
router.patch('/:id', validate(updateMovieSchema), MoviesController.update);
router.delete('/:id', MoviesController.delete);
router.get('/:id/tmdb-diff', MoviesController.getTmdbDiff);
router.post('/:id/tmdb-refresh', MoviesController.applyTmdbRefresh);

export default router;
