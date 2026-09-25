export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  preferred_languages: string[];
  favorite_genres: number[];
  preferred_runtime_min: number;
  preferred_runtime_max: number;
  exclude_watched_default: boolean;
}

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

interface AuthResponse {
  user: User;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface UserProfileUpdate {
  name?: string;
  preferred_languages?: string[];
  favorite_genres?: number[];
  preferred_runtime_min?: number;
  preferred_runtime_max?: number;
  exclude_watched_default?: boolean;
}
