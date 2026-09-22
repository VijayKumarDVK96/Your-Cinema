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

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const rawParent = (req.query.parentId ?? req.query.parent_id) as string | undefined;
    const parentId = rawParent !== undefined ? rawParent : undefined;

    const result = await WatchlistsService.listUserWatchlists(req.user!.id, { page, limit, parentId });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

const bulkMoveSchema = z.object({
  userMovieIds: z.array(z.string().uuid()).min(1, 'At least one movie must be selected'),
  targetWatchlistId: z.string().nullable().optional(),
  action: z.enum(['move', 'copy']).optional().default('move'),
  sourceWatchlistId: z.string().optional(),
});

router.post('/bulk-move', validate(bulkMoveSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userMovieIds, targetWatchlistId, action, sourceWatchlistId } = req.body;
    const result = await WatchlistsService.bulkMoveMovies(
      req.user!.id,
      targetWatchlistId || null,
      userMovieIds,
      action,
      sourceWatchlistId
    );
    return res.status(200).json({ success: true, message: 'Bulk move/copy completed successfully.', data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const status = req.query.status as string | undefined;
    const mediaType = req.query.mediaType as 'all' | 'movie' | 'tv' | undefined;
    const genreId = req.query.genreId as string | undefined;
    const tagId = req.query.tagId as string | undefined;
    const ott = req.query.ott as string | undefined;
    const language = req.query.language as string | undefined;
    const ratingMin = req.query.ratingMin ? parseFloat(req.query.ratingMin as string) : undefined;
    const ratingMax = req.query.ratingMax ? parseFloat(req.query.ratingMax as string) : undefined;
    const isFavorite = req.query.isFavorite === 'true' ? true : req.query.isFavorite === 'false' ? false : undefined;
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
      isFavorite,
      search,
      sortBy,
    });
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
