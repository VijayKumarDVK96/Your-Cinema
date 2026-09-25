import { UserMovie } from './movie.js';

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
