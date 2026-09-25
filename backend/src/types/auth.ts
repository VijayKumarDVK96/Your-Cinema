export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  preferredLanguages?: string[];
  favoriteGenres?: number[];
  preferredRuntimeMin?: number;
  preferredRuntimeMax?: number;
}

export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface ChangePasswordDto {
  currentPassword?: string;
  newPassword?: string;
  current_password?: string;
  new_password?: string;
}

export interface ProfileUpdateDto {
  name?: string;
  avatar_url?: string;
  preferred_languages?: string[];
  favorite_genres?: number[];
  preferred_runtime_min?: number;
  preferred_runtime_max?: number;
  exclude_watched_default?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    preferred_languages?: string[];
    favorite_genres?: number[];
    preferred_runtime_min?: number;
    preferred_runtime_max?: number;
    exclude_watched_default?: boolean;
  };
}
