import { config } from '../../config/index.js';
import { AIProviderAdapter } from './ai.interface.js';
import { GeminiAdapter } from './gemini.adapter.js';
import { OpenRouterAdapter } from './openrouter.adapter.js';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';
import { MoviesService } from '../movies/movies.service.js';
import { TasteService } from '../taste/taste.service.js';

export class AIService {
  static async getAdapterForUser(userId: string): Promise<AIProviderAdapter> {
    let settings: any = null;

    if (isPgConnected) {
      const { rows } = await pool.query('SELECT provider, model_name FROM user_ai_settings WHERE user_id = $1', [userId]);
      if (rows.length > 0) settings = rows[0];
    } else {
      settings = inMemoryDb.userAiSettings.get(userId);
    }

    const provider = settings?.provider || config.ai.defaultProvider;
    const model = settings?.model_name || (provider === 'openrouter' ? config.ai.openRouterModel : config.ai.geminiModel);

    if (provider === 'openrouter') {
      return new OpenRouterAdapter(
        config.ai.openRouterApiKey,
        model,
        config.ai.openRouterBaseUrl
      );
    }

    // Default to Gemini
    return new GeminiAdapter(
      config.ai.geminiApiKey,
      model
    );
  }

  static async getSettings(userId: string) {
    let settings: any = null;

    if (isPgConnected) {
      const { rows } = await pool.query('SELECT provider, model_name FROM user_ai_settings WHERE user_id = $1', [userId]);
      if (rows.length > 0) settings = rows[0];
    } else {
      settings = inMemoryDb.userAiSettings.get(userId);
    }

    const provider = settings?.provider || config.ai.defaultProvider;
    const defaultModel = provider === 'openrouter' ? config.ai.openRouterModel : config.ai.geminiModel;
    const model_name = settings?.model_name || defaultModel;

    return {
      provider,
      model_name,
      gemini_model_default: config.ai.geminiModel,
      openrouter_model_default: config.ai.openRouterModel,
      is_gemini_configured: !!config.ai.geminiApiKey,
      is_openrouter_configured: !!config.ai.openRouterApiKey,
    };
  }

  static async updateSettings(userId: string, data: {
    provider: string;
    model_name?: string;
  }) {
    const defaultModel = data.provider === 'openrouter' ? config.ai.openRouterModel : config.ai.geminiModel;
    const chosenModel = data.model_name?.trim() || defaultModel;

    if (isPgConnected) {
      await pool.query(`
        INSERT INTO user_ai_settings (user_id, provider, model_name, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          provider = EXCLUDED.provider,
          model_name = EXCLUDED.model_name,
          updated_at = NOW()
      `, [userId, data.provider, chosenModel]);
    } else {
      inMemoryDb.userAiSettings.set(userId, {
        user_id: userId,
        provider: data.provider,
        model_name: chosenModel,
      });
    }

    return this.getSettings(userId);
  }

  static async generateTasteSummary(userId: string) {
    const adapter = await this.getAdapterForUser(userId);
    const tasteProfile = await TasteService.getTasteProfile(userId);
    return adapter.generateTasteSummary(tasteProfile);
  }

  static async explainRecommendation(userId: string, userMovieId: string) {
    const adapter = await this.getAdapterForUser(userId);
    const movie = await MoviesService.getMovieById(userId, userMovieId);
    return adapter.explainRecommendation(movie.title, (movie.genres || []).map((g: any) => g.name).join(', '));
  }

  static async askLibraryQuestion(userId: string, query: string) {
    // CRITICAL SAFETY RULE: AI only receives movies currently in user's library!
    const allMoviesRes = await MoviesService.getUserMovies(userId, { limit: 100 });
    const candidates = allMoviesRes.movies.map(m => ({
      id: m.user_movie_id,
      title: m.title,
      director: m.director || '',
      genres: (m.genres || []).map((g: any) => g.name || g.toString()),
    }));

    const adapter = await this.getAdapterForUser(userId);
    const ranked = await adapter.rankLibraryCandidates(query, candidates);

    // Hydrate with movie cards
    const results = ranked.map(r => {
      const match = allMoviesRes.movies.find(m => m.user_movie_id === r.id);
      return {
        movie: match,
        rationale: r.rationale,
      };
    }).filter(item => !!item.movie);

    return results;
  }
}
