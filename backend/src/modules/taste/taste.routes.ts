import { Router, Request, Response, NextFunction } from 'express';
import { TasteService } from './taste.service.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await TasteService.getTasteProfile(req.user!.id);
    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
});

export default router;
