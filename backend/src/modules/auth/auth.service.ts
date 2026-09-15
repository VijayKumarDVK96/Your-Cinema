import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/index.js';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../../utils/errors.js';

export class AuthService {
  static async register(data: { email: string; password: string; name: string }) {
    const existing = isPgConnected
      ? (await pool.query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()])).rows[0]
      : Array.from(inMemoryDb.users.values()).find(u => u.email.toLowerCase() === data.email.toLowerCase());

    if (existing) {
      throw new BadRequestError('An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);
    const userId = uuidv4();

    if (isPgConnected) {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)`,
        [userId, data.email.toLowerCase(), passwordHash, data.name]
      );
    } else {
      inMemoryDb.users.set(userId, {
        id: userId,
        email: data.email.toLowerCase(),
        password_hash: passwordHash,
        name: data.name,
        preferred_languages: ['en'],
        favorite_genres: [],
        preferred_runtime_min: 60,
        preferred_runtime_max: 180,
        exclude_watched_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const tokens = this.generateTokens({ id: userId, email: data.email.toLowerCase(), name: data.name });
    return { user: { id: userId, email: data.email.toLowerCase(), name: data.name }, ...tokens };
  }

  static async login(data: { email: string; password: string; rememberMe?: boolean }) {
    let user = isPgConnected
      ? (await pool.query('SELECT * FROM users WHERE email = $1', [data.email.toLowerCase()])).rows[0]
      : Array.from(inMemoryDb.users.values()).find(u => u.email.toLowerCase() === data.email.toLowerCase());

    if (!user && data.email.toLowerCase() === 'demo@yourcinema.com') {
      if (isPgConnected) {
        await pool.query(
          `INSERT INTO users (id, email, password_hash, name, avatar_url, preferred_languages, favorite_genres, preferred_runtime_min, preferred_runtime_max, exclude_watched_default)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [
            'a0000000-0000-0000-0000-000000000001',
            'demo@yourcinema.com',
            '$2a$10$w8T0i9P1kLp9qG2v.e2Q.OtA/1P1yv9C1kE9lZ8zZ9o9oZ9o9oZ9o',
            'Cinema Enthusiast',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200',
            ['en', 'ta'],
            [878, 53, 18],
            90,
            165,
            true,
          ]
        );
        user = (await pool.query('SELECT * FROM users WHERE email = $1', [data.email.toLowerCase()])).rows[0];
      }
    }

    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isValid = await bcrypt.compare(data.password, user.password_hash);
    // Demo bypass — only active outside production for quick evaluation
    const isDemo =
      config.nodeEnv !== 'production' &&
      user.email === 'demo@yourcinema.com' &&
      data.password === 'password123';
    if (!isValid && !isDemo) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const tokens = this.generateTokens(
      { id: user.id, email: user.email, name: user.name },
      Boolean(data.rememberMe)
    );
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        preferred_languages: user.preferred_languages,
        favorite_genres: user.favorite_genres,
        preferred_runtime_min: user.preferred_runtime_min,
        preferred_runtime_max: user.preferred_runtime_max,
        exclude_watched_default: user.exclude_watched_default,
      },
      ...tokens,
      rememberMe: Boolean(data.rememberMe),
    };
  }

  static async changePassword(userId: string, data: { currentPassword: string; newPassword: string }) {
    const user = isPgConnected
      ? (await pool.query('SELECT * FROM users WHERE id = $1', [userId])).rows[0]
      : inMemoryDb.users.get(userId);

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect.');
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(data.newPassword, salt);

    if (isPgConnected) {
      await pool.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [newHash, userId]
      );
    } else {
      const u = inMemoryDb.users.get(userId);
      if (u) {
        u.password_hash = newHash;
        u.updated_at = new Date().toISOString();
        inMemoryDb.users.set(userId, u);
      }
    }

    return { message: 'Password updated successfully.' };
  }

  static async getProfile(userId: string) {
    let user = isPgConnected
      ? (await pool.query('SELECT id, email, name, avatar_url, preferred_languages, favorite_genres, preferred_runtime_min, preferred_runtime_max, exclude_watched_default FROM users WHERE id = $1', [userId])).rows[0]
      : inMemoryDb.users.get(userId);

    if (!user && userId === 'a0000000-0000-0000-0000-000000000001') {
      if (isPgConnected) {
        await pool.query(
          `INSERT INTO users (id, email, password_hash, name, avatar_url, preferred_languages, favorite_genres, preferred_runtime_min, preferred_runtime_max, exclude_watched_default)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [
            'a0000000-0000-0000-0000-000000000001',
            'demo@yourcinema.com',
            '$2a$10$w8T0i9P1kLp9qG2v.e2Q.OtA/1P1yv9C1kE9lZ8zZ9o9oZ9o9oZ9o',
            'Cinema Enthusiast',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200',
            ['en', 'ta'],
            [878, 53, 18],
            90,
            165,
            true,
          ]
        );
        user = (await pool.query('SELECT id, email, name, avatar_url, preferred_languages, favorite_genres, preferred_runtime_min, preferred_runtime_max, exclude_watched_default FROM users WHERE id = $1', [userId])).rows[0];
      } else {
        const demoUser = {
          id: 'a0000000-0000-0000-0000-000000000001',
          email: 'demo@yourcinema.com',
          name: 'Cinema Enthusiast',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&h=200',
          preferred_languages: ['en', 'ta'],
          favorite_genres: [878, 53, 18],
          preferred_runtime_min: 90,
          preferred_runtime_max: 165,
          exclude_watched_default: true,
        };
        inMemoryDb.users.set(demoUser.id, demoUser);
        user = demoUser;
      }
    }

    if (!user) {
      throw new NotFoundError('User profile not found.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      preferred_languages: user.preferred_languages || ['en'],
      favorite_genres: user.favorite_genres || [],
      preferred_runtime_min: user.preferred_runtime_min || 60,
      preferred_runtime_max: user.preferred_runtime_max || 180,
      exclude_watched_default: user.exclude_watched_default ?? true,
    };
  }

  static async updateProfile(userId: string, data: Partial<{
    name: string;
    avatar_url: string;
    preferred_languages: string[];
    favorite_genres: number[];
    preferred_runtime_min: number;
    preferred_runtime_max: number;
    exclude_watched_default: boolean;
  }>) {
    if (isPgConnected) {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined) {
          fields.push(`${key} = $${idx++}`);
          values.push(val);
        }
      });

      if (fields.length > 0) {
        values.push(userId);
        await pool.query(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values);
      }
    } else {
      const user = inMemoryDb.users.get(userId);
      if (user) {
        Object.assign(user, data, { updated_at: new Date().toISOString() });
        inMemoryDb.users.set(userId, user);
      }
    }

    return this.getProfile(userId);
  }

  static generateTokens(payload: { id: string; email: string; name: string }, rememberMe: boolean = false) {
    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: rememberMe ? '30d' : '15m' });
    const refreshToken = jwt.sign({ id: payload.id }, config.jwt.refreshSecret, { expiresIn: rememberMe ? '30d' : '7d' });
    return { accessToken, refreshToken };
  }
}
