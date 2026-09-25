import { UserMovie } from './movie.js';

export interface Watchlist {
  id: string;
  name: string;
  description?: string | null;
  cover_image_url?: string | null;
  is_smart: boolean;
  smart_criteria?: any;
  parent_id?: string | null;
  display_order: number;
  movie_count?: number;
  movies?: UserMovie[];
  children?: Watchlist[];
}

export interface WatchlistFolder {
  id: string;
  name: string;
  parent_id?: string | null;
  movie_count?: number;
  children?: WatchlistFolder[];
}
