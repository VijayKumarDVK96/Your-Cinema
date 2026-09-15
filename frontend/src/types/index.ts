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

export interface Tag {
  id: string;
  name: string;
  color: string;
  movie_count?: number;
}

export interface Genre {
  id: string | number;
  tmdb_id?: number;
  name: string;
  color?: string;
  description?: string | null;
  is_predefined: boolean;
  movie_count?: number;
}

export interface MovieSource {
  id: string;
  user_movie_id: string;
  source_type: 'google_drive' | 'youtube' | 'ott' | 'custom_url';
  provider_name: string;
  provider_icon?: string;
  external_url?: string | null;
  external_file_id?: string | null;
  file_name?: string | null;
  quality?: string;
}

export interface UserMovie {
  user_movie_id: string;
  movie_id: string;
  tmdb_id: number;
  title: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  runtime?: number;
  original_language?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  director?: string;
  cast_members?: { name: string; character: string; profile_path?: string | null }[];
  crew_members?: { name: string; job: string; department?: string; profile_path?: string | null }[];
  genres?: { id: number; name: string }[];
  keywords?: string[];
  trailer_url?: string | null;
  watch_status: 'unwatched' | 'watching' | 'watched';
  personal_rating?: number | null;
  is_favorite: boolean;
  personal_notes?: string | null;
  custom_title?: string | null;
  custom_overview?: string | null;
  custom_poster_url?: string | null;
  custom_backdrop_url?: string | null;
  custom_runtime?: number | null;
  custom_director?: string | null;
  is_customized?: boolean;
  playback_position_sec?: number;
  last_played_time_formatted?: string | null;
  last_played_source_type?: string | null;
  last_played_source_id?: string | null;
  last_watched_at?: string | null;
  added_at: string;
  media_type?: 'movie' | 'tv';
  number_of_seasons?: number;
  number_of_episodes?: number;
  current_season?: number;
  current_episode?: number;
  series_status?: string;
  first_air_date?: string;
  last_air_date?: string;
  created_by?: { id: number; name: string; profile_path?: string | null }[];
  seasons?: {
    id: number;
    season_number: number;
    name: string;
    episode_count: number;
    air_date?: string | null;
    poster_path?: string | null;
    overview?: string | null;
  }[];
  tags?: Tag[];
  custom_genres?: Genre[];
  sources?: MovieSource[];
}

export interface TmdbSearchResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  original_language: string;
  genre_ids: number[];
  media_type?: 'movie' | 'tv';
  number_of_seasons?: number;
  number_of_episodes?: number;
}

export interface Watchlist {
  id: string;
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  is_smart: boolean;
  smart_criteria?: any;
  display_order: number;
  movie_count?: number;
  movies?: UserMovie[];
}

export interface TasteDnaItem {
  name: string;
  count: number;
  percentage: number;
}

export interface TasteProfile {
  summary: {
    totalMovies: number;
    watchedCount: number;
    unwatchedCount: number;
    watchingCount: number;
    favoritesCount: number;
    averageRating: number;
    totalHoursWatched: number;
  };
  movieDna: TasteDnaItem[];
  topDirectors: { name: string; movieCount: number; avgRating: number | null }[];
  languageCounts: Record<string, number>;
  runtimeBuckets: {
    under90: number;
    between90and120: number;
    between120and150: number;
    over150: number;
  };
  mostUsedTags: Tag[];
  recentActivity: UserMovie[];
}

export interface RecommendationItem {
  movie: UserMovie;
  score: number;
  category: 'best_match' | 'because_you_loved' | 'hidden_gem' | 'wild_card';
  reasons: string[];
  referenceMovieTitle?: string;
}

export interface RecommendationResponse {
  bestMatch: RecommendationItem[];
  becauseYouLoved: RecommendationItem[];
  hiddenGems: RecommendationItem[];
  wildCard: RecommendationItem | null;
  referenceMovieTitle: string | null;
  totalEligible: number;
  message?: string;
}
