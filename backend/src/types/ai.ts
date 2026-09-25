export type AiProvider = 'gemini' | 'openrouter';

export interface AiSettingsConfig {
  provider: AiProvider;
  model_name: string;
}

export interface AiTestResult {
  success: boolean;
  message?: string;
  provider?: string;
  model?: string;
  responsePreview?: string;
  latencyMs?: number;
}

export interface AiExplanationRequest {
  userMovieId: string;
  movieTitle: string;
  overview?: string;
  genres?: string[];
  director?: string;
}

export interface AiRecommendationPrompt {
  userTasteSummary: string;
  favoriteGenres: string[];
  watchedCount: number;
  recentFavorites: string[];
}
