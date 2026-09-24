import { MoviesService } from '../movies/movies.service.js';
import { TagsService } from '../tags/tags.service.js';

const FEMALE_FIRST_NAMES = new Set([
  'emma', 'scarlett', 'anne', 'jennifer', 'jessica', 'meryl', 'natalie', 'cate', 'kate', 'zoe', 'zoë',
  'gal', 'florence', 'anya', 'zendaya', 'margot', 'saoirse', 'charlize', 'amy', 'rachel', 'kristen',
  'keira', 'uma', 'angelina', 'julianne', 'nicole', 'reese', 'helena', 'sandra', 'julia', 'claire',
  'mila', 'penélope', 'penelope', 'salma', 'michelle', 'viola', 'brie', 'elizabeth', 'lily', 'karen',
  'hailee', 'ana', 'eva', 'rose', 'rebecca', 'lucy', 'sigourney', 'gillian', 'kirsten', 'halle',
  'carey', 'lupita', 'alicia', 'dakota', 'rooney', 'winona', 'carrie', 'tilda', 'naomi', 'olivia',
  'leah', 'jodie', 'dianne', 'sarah', 'katherine', 'catherine', 'hannah', 'laura', 'mary', 'victoria',
  'ashley', 'vanessa', 'jess', 'alison', 'sophie', 'kareena', 'deepika', 'priyanka', 'anushka', 'alia',
  'samantha', 'nayanthara', 'trisha', 'sai', 'tamannaah', 'rashmika', 'keerthy', 'aishwarya', 'vidya',
  'tabu', 'kajol', 'rani', 'shraddha', 'kriti', 'kiara', 'pooja', 'taapsee', 'parvathy', 'manju',
  'jyothika', 'simran', 'sneha', 'asin', 'nazriya', 'nithya', 'amala', 'ramya', 'ananya', 'radhika',
  'helen', 'judy', 'audrey', 'marilyn', 'greta', 'ingrid', 'vivien', 'shirley', 'grace', 'diane',
]);

function isFemalePerformer(c: any): boolean {
  if (c.gender === 1) return true;
  if (c.gender === 2) return false;
  if (!c.name) return false;
  const firstName = c.name.toLowerCase().trim().split(' ')[0];
  return FEMALE_FIRST_NAMES.has(firstName);
}

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
    const directorCounts: Record<string, { count: number; ratings: number[]; profile_path?: string | null }> = {};
    movies.forEach(m => {
      if (m.director && m.director !== 'Unknown' && m.director !== 'Showrunner') {
        const directors = m.director.split(',').map((d: string) => d.trim()).filter(Boolean);
        directors.forEach((dirName: string) => {
          if (!directorCounts[dirName]) {
            const crewMember = Array.isArray(m.crew_members)
              ? m.crew_members.find((cr: any) => cr.name?.toLowerCase() === dirName.toLowerCase() && cr.profile_path)
              : null;
            directorCounts[dirName] = { count: 0, ratings: [], profile_path: crewMember?.profile_path || null };
          }
          directorCounts[dirName].count++;
          if (m.personal_rating) directorCounts[dirName].ratings.push(m.personal_rating);
        });
      }
    });

    const topDirectors = Object.entries(directorCounts)
      .map(([name, data]) => ({
        name,
        movieCount: data.count,
        profile_path: data.profile_path,
        avgRating: data.ratings.length > 0
          ? parseFloat((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1))
          : null,
      }))
      .sort((a, b) => b.movieCount - a.movieCount || (b.avgRating || 0) - (a.avgRating || 0))
      .slice(0, 6);

    // Top Actors & Top Actresses in Sanctuary
    const actorMap: Record<string, { name: string; count: number; ratings: number[]; profile_path?: string | null; roles: string[] }> = {};
    const actressMap: Record<string, { name: string; count: number; ratings: number[]; profile_path?: string | null; roles: string[] }> = {};

    movies.forEach(m => {
      const cast = Array.isArray(m.cast_members) ? m.cast_members : [];
      cast.slice(0, 8).forEach((c: any) => {
        if (!c || !c.name) return;
        const name = c.name.trim();
        const profile_path = c.profile_path || null;
        const char = c.character ? c.character.trim() : '';

        const isFemale = isFemalePerformer(c);
        const targetMap = isFemale ? actressMap : actorMap;

        if (!targetMap[name]) {
          targetMap[name] = { name, count: 0, ratings: [], profile_path, roles: [] };
        }
        targetMap[name].count++;
        if (profile_path && !targetMap[name].profile_path) {
          targetMap[name].profile_path = profile_path;
        }
        if (char && !targetMap[name].roles.includes(char)) {
          targetMap[name].roles.push(char);
        }
        if (m.personal_rating) {
          targetMap[name].ratings.push(m.personal_rating);
        }
      });
    });

    const formatCastList = (map: Record<string, any>) =>
      Object.values(map)
        .map((data: any) => ({
          name: data.name,
          movieCount: data.count,
          profile_path: data.profile_path,
          roles: data.roles.slice(0, 2),
          avgRating: data.ratings.length > 0
            ? parseFloat((data.ratings.reduce((a: number, b: number) => a + b, 0) / data.ratings.length).toFixed(1))
            : null,
        }))
        .sort((a, b) => b.movieCount - a.movieCount || (b.avgRating || 0) - (a.avgRating || 0))
        .slice(0, 6);

    const topActors = formatCastList(actorMap);
    const topActresses = formatCastList(actressMap);

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
      topActors,
      topActresses,
      languageCounts,
      runtimeBuckets,
      mostUsedTags: userTags.slice(0, 6),
      recentActivity: watched.slice(0, 4),
    };
  }
}
