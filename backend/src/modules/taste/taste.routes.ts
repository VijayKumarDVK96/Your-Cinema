import { Router } from 'express';
import { TasteController } from './taste.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', TasteController.getProfile);

export default router;
