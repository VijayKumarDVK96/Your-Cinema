import { Router } from 'express';
import { RecommendationsController } from './recommendations.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', RecommendationsController.getRecommendations);
router.post('/pick', RecommendationsController.pickSomething);

export default router;
