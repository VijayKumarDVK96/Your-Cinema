import { Router } from 'express';
import { z } from 'zod';
import { WatchlistsController } from './watchlists.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();
router.use(authenticate);

const createListSchema = z.object({
  name: z.string().min(1, 'Watchlist title is required').max(255),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal('')),
  parent_id: z.string().uuid().optional().nullable().or(z.literal('')),
  is_smart: z.boolean().optional(),
  smart_criteria: z.any().optional(),
});

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal('')),
  parent_id: z.string().uuid().optional().nullable().or(z.literal('')),
  display_order: z.number().optional(),
});

const bulkMoveSchema = z.object({
  userMovieIds: z.array(z.string().uuid()).min(1, 'At least one movie must be selected'),
  targetWatchlistId: z.string().nullable().optional(),
  action: z.enum(['move', 'copy']).optional().default('move'),
  sourceWatchlistId: z.string().optional(),
});

router.get('/', WatchlistsController.list);
router.post('/bulk-move', validate(bulkMoveSchema), WatchlistsController.bulkMove);
router.delete('/clear/all', WatchlistsController.clearAll);
router.get('/:id', WatchlistsController.getOne);
router.post('/', validate(createListSchema), WatchlistsController.create);
router.patch('/:id', validate(updateListSchema), WatchlistsController.update);
router.delete('/:id', WatchlistsController.delete);
router.post('/:id/movies', WatchlistsController.addMovie);
router.delete('/:id/movies/:userMovieId', WatchlistsController.removeMovie);

export default router;
