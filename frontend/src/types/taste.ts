import { Tag, UserMovie } from './movie.js';

export interface TasteDnaItem {
  name: string;
  count: number;
  percentage: number;
}

export interface DirectorStat {
  name: string;
  movieCount: number;
  avgRating: number | null;
}

export interface RuntimeBuckets {
  under90: number;
  between90and120: number;
  between120and150: number;
  over150: number;
}

export interface TasteSummary {
  totalMovies: number;
  watchedCount: number;
  unwatchedCount: number;
  watchingCount: number;
  favoritesCount: number;
  averageRating: number;
  totalHoursWatched: number;
}

export interface TasteProfile {
  summary: TasteSummary;
  movieDna: TasteDnaItem[];
  topDirectors: DirectorStat[];
  languageCounts: Record<string, number>;
  runtimeBuckets: RuntimeBuckets;
  mostUsedTags: Tag[];
  recentActivity: UserMovie[];
}
