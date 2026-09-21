import { Router } from 'express';
import { TmdbController } from './tmdb.controller.js';
import { authenticate } from '../../middlewares/auth.js';

const router = Router();

// TMDB endpoints are strictly protected and used exclusively for "Add Movie" imports
router.get('/search', authenticate, TmdbController.search);
router.get('/movie/:id', authenticate, TmdbController.getDetails);
router.get('/tv/:id', authenticate, TmdbController.getTvDetails);
router.get('/images/:id', authenticate, TmdbController.getImages);

export default router;
