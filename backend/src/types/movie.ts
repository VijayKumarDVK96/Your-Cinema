export type WatchStatus = 'all' | 'unwatched' | 'watching' | 'watched';
export type MediaType = 'all' | 'movie' | 'tv';

export interface MovieFilters {
  status?: WatchStatus;
  genreId?: number | string;
  tagId?: string;
  ott?: string;
  language?: string;
  yearMin?: number;
  yearMax?: number;
  runtimeMin?: number;
  runtimeMax?: number;
  ratingMin?: number;
  ratingMax?: number;
  personalRating?: string;
  isFavorite?: boolean;
  mediaType?: MediaType;
  search?: string;
  sortBy?: 'added_at' | 'release_date' | 'rating' | 'my_rating' | 'tmdb_rating' | 'runtime' | 'title' | 'vote_average' | 'personal_rating';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CastMember {
  name: string;
  character: string;
  profile_path?: string | null;
  gender?: number;
  order?: number;
}

export interface CrewMember {
  name: string;
  job: string;
  department?: string;
  profile_path?: string | null;
  gender?: number;
}

export interface SeasonInfo {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string | null;
  poster_path?: string | null;
  overview?: string | null;
}

export interface Tag {
  id: string;
  user_id?: string;
  name: string;
  color: string;
  movie_count?: number;
  created_at?: string;
}

export interface Genre {
  id: string | number;
  user_id?: string;
  tmdb_id?: number;
  name: string;
  color?: string;
  description?: string | null;
  is_predefined: boolean;
  movie_count?: number;
  created_at?: string;
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
  created_at?: string;
}

export interface Movie {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
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
  cast_members?: CastMember[];
  crew_members?: CrewMember[];
  genres?: { id: number; name: string }[];
  keywords?: string[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  series_status?: string;
  first_air_date?: string;
  last_air_date?: string;
  created_by?: { id: number; name: string; profile_path?: string | null }[];
  seasons?: SeasonInfo[];
  created_at?: string;
  updated_at?: string;
}

export interface UserMovie extends Movie {
  user_movie_id: string;
  movie_id: string;
  user_id: string;
  watch_status: WatchStatus;
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
  assigned_genre?: string | null;
  excluded_genres?: string[];
  trailer_url?: string | null;
  playback_position_sec?: number;
  last_played_time_formatted?: string | null;
  last_played_source_type?: string | null;
  last_played_source_id?: string | null;
  last_watched_at?: string | null;
  added_at: string;
  current_season?: number;
  current_episode?: number;
  tags?: Tag[];
  custom_genres?: Genre[];
  spoken_languages?: string[];
  sources?: MovieSource[];
}

export interface LibraryStats {
  total: number;
  watched: number;
  unwatched: number;
  watching: number;
  favorites: number;
  moviesCount: number;
  seriesCount: number;
  totalRuntimeMin: number;
  totalRuntimeHours: number;
}

