import { Router } from 'express';
import { z } from 'zod';
import { AIController } from './ai.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();
router.use(authenticate);

const updateSettingsSchema = z.object({
  provider: z.enum(['gemini', 'openrouter']),
  model_name: z.string().optional(),
  base_url: z.string().optional(),
  api_key: z.string().optional(),
  is_enabled: z.boolean().optional(),
});

const askQuerySchema = z.object({
  query: z.string().min(1, 'Query is required'),
});

router.get('/settings', AIController.getSettings);
router.post('/settings', validate(updateSettingsSchema), AIController.updateSettings);
router.post('/test', AIController.test);
router.post('/taste-summary', AIController.tasteSummary);
router.post('/explain/:userMovieId', AIController.explain);
router.post('/ask', validate(askQuerySchema), AIController.ask);

export default router;
