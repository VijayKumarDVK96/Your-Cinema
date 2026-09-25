import { Router } from 'express';
import { z } from 'zod';
import { SourcesController } from './sources.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

// Public media streaming
router.get(['/drive/:fileId/stream', '/drive/*'], SourcesController.streamDrive);

// Authenticated routes
router.use(authenticate);

const addSourceSchema = z.object({
  userMovieId: z.string().min(1),
  sourceType: z.enum(['google_drive', 'youtube', 'ott', 'custom_url']),
  providerName: z.string().min(1),
  providerIcon: z.string().optional(),
  externalUrl: z.string().url().optional().nullable(),
  externalFileId: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  quality: z.string().optional(),
});

const progressSchema = z.object({
  positionSec: z.number().min(0),
  completed: z.boolean().optional(),
  sourceId: z.string().optional().nullable(),
  sourceType: z.string().optional().nullable(),
});

router.post('/detect/:userMovieId', SourcesController.detect);
router.get('/movie/:userMovieId', SourcesController.list);
router.get('/movie/:userMovieId/progress', SourcesController.getProgress);
router.post('/', validate(addSourceSchema), SourcesController.add);
router.delete('/:id', SourcesController.delete);
router.post('/movie/:userMovieId/progress', validate(progressSchema), SourcesController.updateProgress);
router.post('/bulk-ott-preview', SourcesController.bulkOttPreview);
router.post('/bulk-ott-apply', SourcesController.bulkOttApply);

export default router;
