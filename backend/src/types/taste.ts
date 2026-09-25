interface TasteDnaItem {
  name: string;
  count: number;
  percentage: number;
}

interface DirectorStat {
  name: string;
  count: number;
  avgRating: number;
  movies: string[];
}

interface ActorStat {
  name: string;
  count: number;
  avgRating: number;
  movies: string[];
  photoUrl?: string | null;
}

interface RuntimeBuckets {
  short: number;    // < 90m
  medium: number;   // 90 - 120m
  feature: number;  // 120 - 150m
  epic: number;     // 150m+
}

interface TasteProfile {
  totalWatched: number;
  totalHoursWatched: number;
  avgRating: number;
  movieDna: TasteDnaItem[];
  topDirectors: DirectorStat[];
  topActors: ActorStat[];
  topActresses: ActorStat[];
  runtimeDistribution: RuntimeBuckets;
  topDecades: { decade: string; count: number }[];
  summary: string;
}

export {};
