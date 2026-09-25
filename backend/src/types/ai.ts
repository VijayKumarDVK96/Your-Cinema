type AiProvider = 'gemini' | 'openrouter';

interface AiSettingsConfig {
  provider: AiProvider;
  model_name: string;
}

interface AiTestResult {
  success: boolean;
  message?: string;
  provider?: string;
  model?: string;
  responsePreview?: string;
  latencyMs?: number;
}

interface AiExplanationRequest {
  userMovieId: string;
  movieTitle: string;
  overview?: string;
  genres?: string[];
  director?: string;
}

interface AiRecommendationPrompt {
  userTasteSummary: string;
  favoriteGenres: string[];
  watchedCount: number;
  recentFavorites: string[];
}

export {};
