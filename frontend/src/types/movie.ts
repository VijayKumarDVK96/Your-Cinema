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

interface CastMember {
  name: string;
  character: string;
  profile_path?: string | null;
}

interface CrewMember {
  name: string;
  job: string;
  department?: string;
  profile_path?: string | null;
}

interface SeasonInfo {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date?: string | null;
  poster_path?: string | null;
  overview?: string | null;
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
  cast_members?: CastMember[];
  crew_members?: CrewMember[];
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
  seasons?: SeasonInfo[];
  tags?: Tag[];
  custom_genres?: Genre[];
  spoken_languages?: string[];
  assigned_genre?: string | null;
  excluded_genres?: string[];
  sources?: MovieSource[];
}

interface TmdbSearchResult {
  id: number;
  title: string;
  name?: string;
  original_title?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  original_language: string;
  genre_ids: number[];
  media_type?: 'movie' | 'tv';
  number_of_seasons?: number;
  number_of_episodes?: number;
}
