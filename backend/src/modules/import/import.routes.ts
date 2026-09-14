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

const commitSchema = z.object({
  selectedTmdbIds: z.array(z.number()).min(1, 'Please select at least one movie to import'),
  watchlistId: z.string().optional(),
  newWatchlistName: z.string().optional(),
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
    const results = await ImportService.commitBatch(req.user!.id, req.body.selectedTmdbIds, {
      watchlistId: req.body.watchlistId,
      newWatchlistName: req.body.newWatchlistName,
    });
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

export default router;
