import { Router } from 'express';
import { z } from 'zod';
import { GenresController } from './genres.controller.js';
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

router.get('/', GenresController.list);
router.post('/', validate(createGenreSchema), GenresController.create);
router.delete('/clear/all', GenresController.clearAll);
router.patch('/:id', validate(updateGenreSchema), GenresController.update);
router.delete('/:id', GenresController.delete);
router.post('/attach', validate(attachSchema), GenresController.attach);
router.post('/detach', validate(attachSchema), GenresController.detach);

export default router;
