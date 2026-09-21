import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { Logger } from './utils/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { runMigrations } from './db/migrate.js';

// Routers
import authRoutes from './modules/auth/auth.routes.js';
import tmdbRoutes from './modules/tmdb/tmdb.routes.js';
import moviesRoutes from './modules/movies/movies.routes.js';
import tagsRoutes from './modules/tags/tags.routes.js';
import genresRoutes from './modules/genres/genres.routes.js';
import watchlistsRoutes from './modules/watchlists/watchlists.routes.js';
import recommendationsRoutes from './modules/recommendations/recommendations.routes.js';
import tasteRoutes from './modules/taste/taste.routes.js';
import importRoutes from './modules/import/import.routes.js';
import sourcesRoutes from './modules/sources/sources.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';

const app = express();
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: [
    config.clientUrl,
    'https://vijayott.duckdns.org',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body Parsers
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: { message: 'Too many login attempts. Please try again in 15 minutes.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Your Cinema API',
    timestamp: new Date().toISOString(),
    philosophy: 'Personal Movie Library & Taste Engine',
  });
});

// Route registration
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/genres', genresRoutes);
app.use('/api/watchlists', watchlistsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/taste', tasteRoutes);
app.use('/api/import', importRoutes);
app.use('/api/sources', sourcesRoutes);
app.use('/api/ai', aiRoutes);

// Centralized error handler
app.use(errorHandler);

// Start server
const port = config.port;

async function startServer() {
  try {
    await runMigrations();
  } catch (err: any) {
    Logger.warn(`Initial database migration notice: ${err.message}. Backend will continue with resilient data storage.`);
  }

  app.listen(port, () => {
    Logger.info(`=======================================================`);
    Logger.info(`🎬 Your Cinema Server running on http://localhost:${port}`);
    Logger.info(`🚀 Client allowed origin: ${config.clientUrl}`);
    Logger.info(`🔒 Mode: ${config.nodeEnv} | Zero Video Storage Policy Enforced`);
    Logger.info(`=======================================================`);
  });
}

startServer();

export default app;
