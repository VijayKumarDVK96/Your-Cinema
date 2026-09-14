import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WatchlistsService } from './watchlists.service.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();
router.use(authenticate);

const createListSchema = z.object({
  name: z.string().min(1, 'Watchlist title is required').max(255),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal('')),
  is_smart: z.boolean().optional(),
  smart_criteria: z.any().optional(),
});

const updateListSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  cover_image_url: z.string().url().optional().nullable().or(z.literal('')),
  display_order: z.number().optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lists = await WatchlistsService.listUserWatchlists(req.user!.id);
    return res.status(200).json({ success: true, data: lists });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await WatchlistsService.getWatchlistById(req.user!.id, req.params.id);
    return res.status(200).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createListSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await WatchlistsService.createWatchlist(req.user!.id, req.body);
    return res.status(201).json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(updateListSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await WatchlistsService.updateWatchlist(req.user!.id, req.params.id, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/clear/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await WatchlistsService.clearAllUserWatchlists(req.user!.id);
    return res.status(200).json({ success: true, message: 'All watchlists removed from your sanctuary.', data: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await WatchlistsService.deleteWatchlist(req.user!.id, req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/movies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userMovieId } = req.body;
    await WatchlistsService.addMovieToList(req.user!.id, req.params.id, userMovieId);
    return res.status(200).json({ success: true, message: 'Movie added to watchlist.' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/movies/:userMovieId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await WatchlistsService.removeMovieFromList(req.user!.id, req.params.id, req.params.userMovieId);
    return res.status(200).json({ success: true, message: 'Movie removed from watchlist.' });
  } catch (err) {
    next(err);
  }
});

export default router;
