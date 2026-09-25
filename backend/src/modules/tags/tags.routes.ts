import { Router } from 'express';
import { z } from 'zod';
import { TagsController } from './tags.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();
router.use(authenticate);

const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(100),
  color: z.string().optional(),
});

router.get('/', TagsController.list);
router.post('/', validate(createTagSchema), TagsController.create);
router.delete('/:id', TagsController.delete);
router.post('/attach', TagsController.attach);
router.post('/detach', TagsController.detach);

export default router;
