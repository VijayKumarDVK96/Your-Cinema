import { TmdbService } from '../tmdb/tmdb.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { WatchlistsService } from '../watchlists/watchlists.service.js';
import { GenresService } from '../genres/genres.service.js';
import { BadRequestError } from '../../utils/errors.js';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';

export interface BulkMatchItem {
  inputTitle: string;
  status: 'matched' | 'ambiguous' | 'not_found';
  confidence: number;
  selectedMovie: any | null;
  candidates: any[];
}

export class ImportService {
  static async matchTitles(titles: string[]): Promise<BulkMatchItem[]> {
    if (!titles || titles.length === 0) {
      throw new BadRequestError('Please provide at least one movie title to import.');
    }

    const cleanList = titles
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .slice(0, 50); // limit batch to 50 items

    const matchResults: BulkMatchItem[] = [];

    for (const input of cleanList) {
      // Extract optional release year e.g. "Interstellar (2014)"
      let searchTitle = input;
      const yearMatch = input.match(/\((\d{4})\)/);
      const parsedYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
      if (parsedYear) {
        searchTitle = input.replace(/\(\d{4}\)/, '').trim();
      }

      try {
        const res = await TmdbService.searchMovies(searchTitle, 1);
        const candidates = res.results || [];

        if (candidates.length === 0) {
          matchResults.push({
            inputTitle: input,
            status: 'not_found',
            confidence: 0,
            selectedMovie: null,
            candidates: [],
          });
        } else if (candidates.length === 1) {
          matchResults.push({
            inputTitle: input,
            status: 'matched',
            confidence: 95,
            selectedMovie: candidates[0],
            candidates,
          });
        } else {
          // Multiple results: check if first is exact match
          const exact = candidates.find(c =>
            c.title.toLowerCase() === searchTitle.toLowerCase() &&
            (!parsedYear || (c.release_date && c.release_date.startsWith(parsedYear.toString())))
          );

          if (exact) {
            matchResults.push({
              inputTitle: input,
              status: 'matched',
              confidence: 90,
              selectedMovie: exact,
              candidates: candidates.slice(0, 5),
            });
          } else {
            matchResults.push({
              inputTitle: input,
              status: 'ambiguous',
              confidence: 60,
              selectedMovie: candidates[0],
              candidates: candidates.slice(0, 5),
            });
          }
        }
      } catch (err) {
        matchResults.push({
          inputTitle: input,
          status: 'not_found',
          confidence: 0,
          selectedMovie: null,
          candidates: [],
        });
      }
    }

    return matchResults;
  }

  static async commitBatch(
    userId: string,
    selectedTmdbIds: number[],
    options?: { watchlistId?: string; newWatchlistName?: string; customGenreIds?: string[] }
  ) {
    if (!selectedTmdbIds || selectedTmdbIds.length === 0) {
      throw new BadRequestError('No approved movies were selected for import.');
    }

    let targetWatchlistId = options?.watchlistId;
    let targetWatchlistName: string | undefined;

    if (options?.newWatchlistName && options.newWatchlistName.trim()) {
      const newW = await WatchlistsService.createWatchlist(userId, {
        name: options.newWatchlistName.trim(),
      });
      targetWatchlistId = newW.id;
      targetWatchlistName = newW.name;
    } else if (targetWatchlistId) {
      try {
        const wl = await WatchlistsService.getWatchlistById(userId, targetWatchlistId);
        targetWatchlistName = wl.name;
      } catch {
        // ignore invalid watchlist id
      }
    }

    const added: any[] = [];
    const skipped: any[] = [];
    let watchlistAddedCount = 0;

    for (const tmdbId of selectedTmdbIds) {
      let userMovieId: string | null = null;
      try {
        const movie = await MoviesService.addMovie(userId, tmdbId);
        userMovieId = movie.user_movie_id || movie.id;
        added.push(movie);
      } catch (err: any) {
        // Find existing movie if it was already in library
        if (isPgConnected) {
          const res = await pool.query(
            `SELECT um.id FROM user_movies um
             JOIN movies m ON um.movie_id = m.id
             WHERE um.user_id = $1 AND m.tmdb_id = $2`,
            [userId, tmdbId]
          );
          if (res.rows.length > 0) {
            userMovieId = res.rows[0].id;
          }
        } else {
          const canonical = Array.from(inMemoryDb.movies.values()).find(m => m.tmdb_id === tmdbId);
          if (canonical) {
            const um = Array.from(inMemoryDb.userMovies.values()).find(
              u => u.user_id === userId && u.movie_id === canonical.id
            );
            if (um) userMovieId = um.id;
          }
        }
        skipped.push({ tmdbId, reason: err.message });
      }

      if (targetWatchlistId && userMovieId) {
        try {
          await WatchlistsService.addMovieToList(userId, targetWatchlistId, userMovieId);
          watchlistAddedCount++;
        } catch {
          // already in watchlist or not found
        }
      }

      // Attach selected custom genres to this movie
      if (userMovieId && options?.customGenreIds && options.customGenreIds.length > 0) {
        for (const genreId of options.customGenreIds) {
          try {
            await GenresService.attachGenreToMovie(userMovieId, genreId);
          } catch {
            // Ignore errors (duplicate / invalid genre id)
          }
        }
      }
    }

    return {
      success: true,
      addedCount: added.length,
      skippedCount: skipped.length,
      watchlistId: targetWatchlistId,
      watchlistName: targetWatchlistName,
      watchlistAddedCount,
      added,
      skipped,
    };
  }
}
