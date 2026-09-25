interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  vote_count?: number;
  media_type?: 'movie' | 'tv' | 'person';
  genre_ids?: number[];
  inLibrary?: boolean;
}

interface TmdbImageItem {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
  vote_average?: number;
  vote_count?: number;
  iso_639_1?: string | null;
}

interface TmdbImagesResponse {
  id: number;
  backdrops: TmdbImageItem[];
  posters: TmdbImageItem[];
  logos?: TmdbImageItem[];
}

export {};
