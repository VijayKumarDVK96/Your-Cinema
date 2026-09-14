import { MoviesService } from '../movies/movies.service.js';
import { TagsService } from '../tags/tags.service.js';

export class TasteService {
  static async getTasteProfile(userId: string) {
    const moviesRes = await MoviesService.getUserMovies(userId, { limit: 1000 });
    const movies = moviesRes.movies;
    const userTags = await TagsService.listUserTags(userId);

    const watched = movies.filter(m => m.watch_status === 'watched');
    const unwatched = movies.filter(m => m.watch_status === 'unwatched');
    const watching = movies.filter(m => m.watch_status === 'watching');
    const favorites = movies.filter(m => m.is_favorite);

    // Compute ratings
    const rated = watched.filter(m => m.personal_rating !== null && m.personal_rating !== undefined);
    const avgRating = rated.length > 0
      ? parseFloat((rated.reduce((acc, m) => acc + (m.personal_rating || 0), 0) / rated.length).toFixed(1))
      : 0;

    // Total hours watched
    const totalRuntimeMin = watched.reduce((acc, m) => acc + (m.runtime || 0), 0);
    const totalHoursWatched = parseFloat((totalRuntimeMin / 60).toFixed(1));

    // Genre Distribution (Movie DNA)
    const genreCounts: Record<string, number> = {};
    movies.forEach(m => {
      (m.genres || []).forEach((g: any) => {
        const name = g.name || 'Unknown';
        genreCounts[name] = (genreCounts[name] || 0) + 1;
      });
    });

    const totalGenreHits = Object.values(genreCounts).reduce((a, b) => a + b, 0) || 1;
    const movieDna = Object.entries(genreCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalGenreHits) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Top Directors
    const directorCounts: Record<string, { count: number; ratings: number[] }> = {};
    watched.forEach(m => {
      if (m.director) {
        if (!directorCounts[m.director]) {
          directorCounts[m.director] = { count: 0, ratings: [] };
        }
        directorCounts[m.director].count++;
        if (m.personal_rating) directorCounts[m.director].ratings.push(m.personal_rating);
      }
    });

    const topDirectors = Object.entries(directorCounts)
      .map(([name, data]) => ({
        name,
        movieCount: data.count,
        avgRating: data.ratings.length > 0
          ? parseFloat((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1))
          : null,
      }))
      .sort((a, b) => b.movieCount - a.movieCount)
      .slice(0, 5);

    // Languages distribution
    const languageCounts: Record<string, number> = {};
    movies.forEach(m => {
      const lang = (m.original_language || 'en').toUpperCase();
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    // Runtime Buckets
    const runtimeBuckets = {
      under90: movies.filter(m => (m.runtime || 0) < 90).length,
      between90and120: movies.filter(m => (m.runtime || 0) >= 90 && (m.runtime || 0) <= 120).length,
      between120and150: movies.filter(m => (m.runtime || 0) > 120 && (m.runtime || 0) <= 150).length,
      over150: movies.filter(m => (m.runtime || 0) > 150).length,
    };

    return {
      summary: {
        totalMovies: movies.length,
        watchedCount: watched.length,
        unwatchedCount: unwatched.length,
        watchingCount: watching.length,
        favoritesCount: favorites.length,
        averageRating: avgRating,
        totalHoursWatched,
      },
      movieDna,
      topDirectors,
      languageCounts,
      runtimeBuckets,
      mostUsedTags: userTags.slice(0, 6),
      recentActivity: watched.slice(0, 4),
    };
  }
}
