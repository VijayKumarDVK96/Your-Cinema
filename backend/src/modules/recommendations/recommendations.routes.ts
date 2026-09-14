import { Router, Request, Response, NextFunction } from 'express';
import { RecommendationsService } from './recommendations.service.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await RecommendationsService.getRecommendations(req.user!.id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/pick', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await RecommendationsService.pickSomethingForMe(req.user!.id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
