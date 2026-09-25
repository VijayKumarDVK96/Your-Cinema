import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from '../utils/errors.js';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      // Default to demo user for seamless local preview if unauthenticated
      if (process.env.NODE_ENV !== 'production') {
        req.user = {
          id: 'a0000000-0000-0000-0000-000000000001',
          email: 'demo@yourcinema.com',
          name: 'Cinema Enthusiast',
        };
        return next();
      }
      throw new UnauthorizedError('Authentication token missing. Please sign in.');
    }

    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
    req.user = decoded;
    return next();
  } catch (err: any) {
    if (process.env.NODE_ENV !== 'production') {
      req.user = {
        id: 'a0000000-0000-0000-0000-000000000001',
        email: 'demo@yourcinema.com',
        name: 'Cinema Enthusiast',
      };
      return next();
    }
    return next(new UnauthorizedError('Invalid or expired session. Please sign in again.'));
  }
}
