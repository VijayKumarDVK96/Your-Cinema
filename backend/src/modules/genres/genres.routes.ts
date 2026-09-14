import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { GenresService } from './genres.service.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();
router.use(authenticate);

const createGenreSchema = z.object({
  name: z.string().min(1, 'Genre name is required').max(100),
  color: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const updateGenreSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const attachSchema = z.object({
  userMovieId: z.string().min(1),
  genreId: z.string().min(1),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await GenresService.listGenres(req.user!.id);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createGenreSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await GenresService.createCustomGenre(req.user!.id, req.body);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(updateGenreSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await GenresService.updateCustomGenre(req.user!.id, req.params.id, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete('/clear/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await GenresService.clearAllCustomGenres(req.user!.id);
    return res.status(200).json({ success: true, message: 'All custom genres removed from your sanctuary.', data: result });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await GenresService.deleteCustomGenre(req.user!.id, req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/attach', validate(attachSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await GenresService.attachGenreToMovie(req.body.userMovieId, req.body.genreId);
    return res.status(200).json({ success: true, data: result, message: 'Genre attached to movie.' });
  } catch (err) {
    next(err);
  }
});

router.post('/detach', validate(attachSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await GenresService.detachGenreFromMovie(req.body.userMovieId, req.body.genreId);
    return res.status(200).json({ success: true, data: result, message: 'Genre detached from movie.' });
  } catch (err) {
    next(err);
  }
});

export default router;
