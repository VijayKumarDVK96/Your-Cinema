import { MoviesService } from '../movies/movies.service.js';
import { AuthService } from '../auth/auth.service.js';

export interface ScoredRecommendation {
  movie: any;
  score: number; // 0 - 100
  category: 'best_match' | 'because_you_loved' | 'hidden_gem' | 'wild_card';
  reasons: string[];
  referenceMovieTitle?: string;
}

export class RecommendationsService {
  static async getRecommendations(userId: string) {
    const profile = await AuthService.getProfile(userId);
    const allUserMoviesRes = await MoviesService.getUserMovies(userId, { limit: 500 });
    const allMovies = allUserMoviesRes.movies;

    const unwatched = allMovies.filter(m => m.watch_status === 'unwatched');
    const watched = allMovies.filter(m => m.watch_status === 'watched');
    const highlyRated = watched.filter(m => (m.personal_rating || 0) >= 4.0 || m.is_favorite);

    if (unwatched.length === 0) {
      return {
        bestMatch: [],
        becauseYouLoved: [],
        hiddenGems: [],
        wildCard: null,
        totalEligible: 0,
        message: allMovies.length === 0
          ? 'Your library is empty. Add movies to unlock recommendations.'
          : 'You have watched all movies in your library! Add more unwatched films to receive recommendations.',
      };
    }

    // Build User Taste Affinities
    const genreAffinities: Record<string, number> = {};
    const directorAffinities: Record<string, number> = {};
    const languageAffinities: Record<string, number> = {};
    const negativeGenres = new Set<string>();

    // Add profile preferred genres
    (profile.favorite_genres || []).forEach((gId: any) => {
      genreAffinities[gId.toString()] = (genreAffinities[gId.toString()] || 0) + 3;
    });
    (profile.preferred_languages || []).forEach((lang: any) => {
      languageAffinities[lang] = 2;
    });

    // Learn from rated watched movies
    watched.forEach(m => {
      const rating = m.personal_rating || 3.0;
      const weight = rating >= 4.5 ? 4 : rating >= 4.0 ? 3 : rating <= 2.0 ? -3 : 1;

      (m.genres || []).forEach((g: any) => {
        const key = g.name || g.id.toString();
        if (weight < 0) {
          negativeGenres.add(key);
        } else {
          genreAffinities[key] = (genreAffinities[key] || 0) + weight;
        }
      });

      if (m.director && weight > 0) {
        directorAffinities[m.director] = (directorAffinities[m.director] || 0) + weight;
      }

      if (m.original_language && weight > 0) {
        languageAffinities[m.original_language] = (languageAffinities[m.original_language] || 0) + 1;
      }
    });

    // Score every unwatched movie
    const scoredList: ScoredRecommendation[] = unwatched.map(movie => {
      let rawScore = 30; // Base score
      const reasons: string[] = [];

      // Genre score
      let matchedGenresCount = 0;
      (movie.genres || []).forEach((g: any) => {
        const key = g.name || g.id.toString();
        if (negativeGenres.has(key)) {
          rawScore -= 20;
        } else if (genreAffinities[key]) {
          rawScore += Math.min(genreAffinities[key] * 5, 25);
          matchedGenresCount++;
        }
      });
      if (matchedGenresCount > 0) {
        reasons.push(`Matches your preferred genres (${(movie.genres || []).map((g: any) => g.name).slice(0, 2).join(', ')})`);
      }

      // Director score
      if (movie.director && directorAffinities[movie.director]) {
        rawScore += 25;
        reasons.push(`Directed by ${movie.director}, whom you've rated highly`);
      }

      // Language match
      if (movie.original_language && languageAffinities[movie.original_language]) {
        rawScore += 10;
        reasons.push(`In your preferred language (${movie.original_language.toUpperCase()})`);
      }

      // Runtime preference
      const runtime = movie.runtime || 120;
      if (runtime >= (profile.preferred_runtime_min || 60) && runtime <= (profile.preferred_runtime_max || 180)) {
        rawScore += 10;
        reasons.push(`Fits your ideal runtime preference (${runtime} min)`);
      }

      // Tag affinity
      if (movie.tags && movie.tags.length > 0) {
        rawScore += 10;
        reasons.push(`Contains your personal tags: ${movie.tags.map((t: any) => t.name).join(', ')}`);
      }

      // Vote average boost
      if (movie.vote_average && movie.vote_average >= 8.0) {
        rawScore += 10;
      }

      // Normalize score between 40 and 99
      const finalScore = Math.min(Math.max(rawScore, 42), 98);

      if (reasons.length === 0) {
        reasons.push('Early recommendation based on your current library collection');
      }

      return {
        movie,
        score: finalScore,
        category: 'best_match',
        reasons,
      };
    });

    scoredList.sort((a, b) => b.score - a.score);

    // 1. Best Matches
    const bestMatch = scoredList.slice(0, 8);

    // 2. "Because You Loved..."
    let becauseYouLoved: ScoredRecommendation[] = [];
    let referenceMovie = highlyRated.length > 0 ? highlyRated[0] : null;

    if (referenceMovie) {
      const refGenres = new Set((referenceMovie.genres || []).map((g: any) => g.name));
      becauseYouLoved = unwatched
        .filter(m => m.movie_id !== referenceMovie!.movie_id)
        .map(m => {
          const common = (m.genres || []).filter((g: any) => refGenres.has(g.name));
          const directorMatch = m.director && m.director === referenceMovie!.director;
          const score = Math.min(50 + common.length * 15 + (directorMatch ? 25 : 0), 96);
          const reasons = [
            `Similar vibe to "${referenceMovie!.title}"`,
            ...(directorMatch ? [`Also directed by ${m.director}`] : []),
            `Shares genres: ${common.map((g: any) => g.name).join(', ')}`,
          ];
          return {
            movie: m,
            score,
            category: 'because_you_loved' as const,
            reasons,
            referenceMovieTitle: referenceMovie!.title,
          };
        })
        .filter(rec => rec.score >= 60)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);
    }

    // 3. Hidden Gems (strong score, unwatched, rich story)
    const hiddenGems = scoredList
      .filter(item => item.score >= 70 && !bestMatch.slice(0, 3).some(bm => bm.movie.user_movie_id === item.movie.user_movie_id))
      .slice(0, 6)
      .map(item => ({ ...item, category: 'hidden_gem' as const }));

    // 4. Wild Card (pick high quality but with a distinct flavor)
    const wildCardCandidate = scoredList.find(item => item.score < 80 && item.score >= 55) || scoredList[scoredList.length - 1];
    const wildCard = wildCardCandidate ? {
      ...wildCardCandidate,
      category: 'wild_card' as const,
      reasons: ['A unique addition from your library outside your primary routine'],
    } : null;

    return {
      bestMatch,
      becauseYouLoved,
      hiddenGems,
      wildCard,
      referenceMovieTitle: referenceMovie ? referenceMovie.title : null,
      totalEligible: unwatched.length,
    };
  }

  static async pickSomethingForMe(userId: string) {
    const recs = await this.getRecommendations(userId);
    if (!recs.bestMatch || recs.bestMatch.length === 0) {
      return null;
    }

    // Pick randomly from the top 3 best matches for dynamic variety
    const topCandidates = recs.bestMatch.slice(0, 3);
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    return {
      pick: chosen,
      unwatchedCount: recs.totalEligible,
    };
  }
}
