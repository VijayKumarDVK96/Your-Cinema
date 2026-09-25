import { Genre } from './movie.js';

export interface AiSettingsConfig {
  provider: 'gemini' | 'openrouter';
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

export interface SanctuaryBackupData {
  version: string;
  exported_at: string;
  user_preferences: {
    name?: string;
    preferred_languages?: string[];
    preferred_runtime_min?: number;
    preferred_runtime_max?: number;
    exclude_watched_default?: boolean;
  };
  custom_genres: Genre[];
  watchlists: any[];
  movies: any[];
}
