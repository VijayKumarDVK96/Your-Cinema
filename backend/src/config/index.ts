import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  db: {
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/your_cinema',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'your_cinema',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your_cinema_default_jwt_secret_dev_key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_cinema_default_refresh_secret_dev_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
    baseUrl: process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3',
  },

  ai: {
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'gemini',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
    openRouterModel: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
    openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  },
};

