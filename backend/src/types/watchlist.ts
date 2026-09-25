import { UserMovie } from './movie.js';

interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  is_smart: boolean;
  smart_filter?: any;
  parent_id?: string | null;
  movie_count?: number;
  movies?: UserMovie[];
  subfolders?: WatchlistFolder[];
  created_at?: string;
  updated_at?: string;
}

interface WatchlistFolder {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  movie_count?: number;
  watchlists?: Watchlist[];
  created_at?: string;
  updated_at?: string;
}

interface CreateWatchlistDto {
  name: string;
  description?: string;
  cover_image_url?: string;
  is_smart?: boolean;
  smart_filter?: any;
  parent_id?: string | null;
}

interface UpdateWatchlistDto {
  name?: string;
  description?: string;
  cover_image_url?: string;
  is_smart?: boolean;
  smart_filter?: any;
  parent_id?: string | null;
}
