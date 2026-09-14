import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  avatar_url: z.string().url().optional().nullable(),
  preferred_languages: z.array(z.string()).optional(),
  favorite_genres: z.array(z.number()).optional(),
  preferred_runtime_min: z.number().optional(),
  preferred_runtime_max: z.number().optional(),
  exclude_watched_default: z.boolean().optional(),
});

router.post('/register', validate(registerSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);
router.patch('/profile', authenticate, validate(profileUpdateSchema), AuthController.updateProfile);

export default router;
