import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AIService } from './ai.service.js';
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

router.get('/settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await AIService.getSettings(req.user!.id);
    return res.status(200).json({ success: true, data: settings });
  } catch (err) {
    next(err);
  }
});

router.post('/settings', validate(updateSettingsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await AIService.updateSettings(req.user!.id, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adapter = await AIService.getAdapterForUser(req.user!.id);
    const testResult = await adapter.testConnection();
    return res.status(200).json({ success: true, data: testResult });
  } catch (err) {
    next(err);
  }
});

router.post('/taste-summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await AIService.generateTasteSummary(req.user!.id);
    return res.status(200).json({ success: true, data: { summary } });
  } catch (err) {
    next(err);
  }
});

router.post('/explain/:userMovieId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const explanation = await AIService.explainRecommendation(req.user!.id, req.params.userMovieId);
    return res.status(200).json({ success: true, data: { explanation } });
  } catch (err) {
    next(err);
  }
});

router.post('/ask', validate(askQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await AIService.askLibraryQuestion(req.user!.id, req.body.query);
    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

export default router;
