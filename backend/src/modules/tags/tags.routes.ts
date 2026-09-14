import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TagsService } from './tags.service.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();
router.use(authenticate);

const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(100),
  color: z.string().optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags = await TagsService.listUserTags(req.user!.id);
    return res.status(200).json({ success: true, data: tags });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createTagSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tag = await TagsService.createTag(req.user!.id, req.body);
    return res.status(201).json({ success: true, data: tag });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await TagsService.deleteTag(req.user!.id, req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/attach', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userMovieId, tagId } = req.body;
    await TagsService.attachTagToMovie(userMovieId, tagId);
    return res.status(200).json({ success: true, message: 'Tag attached' });
  } catch (err) {
    next(err);
  }
});

router.post('/detach', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userMovieId, tagId } = req.body;
    await TagsService.detachTagFromMovie(userMovieId, tagId);
    return res.status(200).json({ success: true, message: 'Tag detached' });
  } catch (err) {
    next(err);
  }
});

export default router;
