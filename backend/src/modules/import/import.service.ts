import { TmdbService } from '../tmdb/tmdb.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { WatchlistsService } from '../watchlists/watchlists.service.js';
import { GenresService } from '../genres/genres.service.js';
import { SourcesService, detectProviderFromUrl } from '../sources/sources.service.js';
import { BadRequestError } from '../../utils/errors.js';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';

export interface BulkMatchItem {
  inputTitle: string;
  searchTitle: string;
  parsedRating?: number | null;
  parsedStatus?: 'unwatched' | 'watching' | 'watched';
  parsedFavorite?: boolean;
  parsedWatchlistName?: string;
  parsedGenreName?: string;
  parsedProviderName?: string;
  parsedDirectUrl?: string;
  status: 'matched' | 'ambiguous' | 'not_found';
  confidence: number;
  selectedMovie: any | null;
  candidates: any[];
}

export interface CommitMovieItem {
  tmdbId?: number;
  tmdb_id?: number;
  id?: number;
  watchStatus?: 'unwatched' | 'watching' | 'watched';
  watch_status?: 'unwatched' | 'watching' | 'watched';
  personalRating?: number | null;
  personal_rating?: number | null;
  isFavorite?: boolean;
  is_favorite?: boolean;
  watchlistId?: string;
  watchlist_id?: string;
  genreId?: string;
  genre_id?: string;
  genreName?: string;
  genre_name?: string;
  genreIds?: string[];
  genre_ids?: string[];
  customGenreIds?: string[];
  providerName?: string;
  provider_name?: string;
  directUrl?: string;
  direct_url?: string;
  ottUrl?: string;
  ott_url?: string;
}

export class ImportService {
  static parseLine(rawInput: string) {
    const parts = rawInput.split('|').map(p => p.trim());
    const mainTitle = parts[0] || '';

    let searchTitle = mainTitle;
    const yearMatch = mainTitle.match(/\((\d{4})\)/);
    const parsedYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
    if (parsedYear) {
      searchTitle = mainTitle.replace(/\(\d{4}\)/, '').trim();
    }

    let parsedRating: number | null = null;
    let parsedStatus: 'unwatched' | 'watching' | 'watched' | undefined = undefined;
    let parsedFavorite: boolean | undefined = undefined;
    let parsedWatchlistName: string | undefined = undefined;
    let parsedGenreName: string | undefined = undefined;
    let parsedProviderName: string | undefined = undefined;
    let parsedDirectUrl: string | undefined = undefined;

    const KNOWN_GENRES = [
      'action', 'adventure', 'animation', 'comedy', 'crime', 'drama', 'family',
      'fantasy', 'history', 'horror', 'mystery', 'science fiction', 'sci-fi', 'scifi',
      'thriller', 'war', 'dark comedy', 'friendship', 'gangster', 'heist', 'love',
      'motivation', 'politics', 'sports', 'super heroes', 'superhero', 'survival',
      'space', 'time travel', 'travel'
    ];

    const KNOWN_PROVIDERS = [
      'netflix', 'jiohotstar', 'jio hotstar', 'hotstar', 'disney+ hotstar', 'disney hotstar', 'prime video',
      'amazon prime', 'amazon prime video', 'sun nxt', 'sunnxt', 'zee5', 'zee 5',
      'jiocinema', 'jio cinema', 'sonyliv', 'sony liv', 'aha', 'apple tv', 'apple tv+',
      'youtube', 'google drive', 'drive'
    ];

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const lower = part.toLowerCase();

      if (lower.startsWith('http://') || lower.startsWith('https://')) {
        parsedDirectUrl = part;
        if (!parsedProviderName) {
          parsedProviderName = detectProviderFromUrl(part, 'Streaming Service');
        }
        continue;
      }

      if (lower.startsWith('watchlist:') || lower.startsWith('wl:')) {
        const idx = part.indexOf(':');
        parsedWatchlistName = part.substring(idx + 1).trim();
        continue;
      }

      if (lower.startsWith('genre:') || lower.startsWith('g:')) {
        const idx = part.indexOf(':');
        parsedGenreName = part.substring(idx + 1).trim();
        continue;
      }

      if (lower.startsWith('ott:') || lower.startsWith('provider:') || lower.startsWith('link:')) {
        const idx = part.indexOf(':');
        const val = part.substring(idx + 1).trim();
        if (val.startsWith('http://') || val.startsWith('https://')) {
          parsedDirectUrl = val;
          if (!parsedProviderName) {
            parsedProviderName = detectProviderFromUrl(val, 'Streaming Service');
          }
        } else {
          parsedProviderName = val;
        }
        continue;
      }

      const num = parseFloat(part);
      if (!isNaN(num) && num >= 0 && num <= 10) {
        // Scale 10-point scale ratings (>5) down to 5-star scale with 0.5 precision
        parsedRating = num > 5 ? Math.round((num / 2) * 2) / 2 : num;
        continue;
      }

      if (lower === 'watched' || lower === 'watching' || lower === 'unwatched') {
        parsedStatus = lower as any;
        continue;
      }

      if (lower === 'fav' || lower === 'favorite' || lower === 'favourite' || lower === 'like' || lower === 'true') {
        parsedFavorite = true;
        continue;
      }

      if (!parsedGenreName && KNOWN_GENRES.includes(lower)) {
        parsedGenreName = part;
        continue;
      }

      if (!parsedProviderName && KNOWN_PROVIDERS.includes(lower)) {
        parsedProviderName = part;
        continue;
      }
    }

    if (parsedDirectUrl && !parsedProviderName) {
      parsedProviderName = detectProviderFromUrl(parsedDirectUrl, 'Streaming Service');
    }

    return {
      rawInput,
      mainTitle,
      searchTitle,
      parsedYear,
      parsedRating,
      parsedStatus,
      parsedFavorite,
      parsedWatchlistName,
      parsedGenreName,
      parsedProviderName,
      parsedDirectUrl,
    };
  }

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
      const parsed = this.parseLine(input);

      try {
        const res = await TmdbService.searchMovies(parsed.searchTitle, 1);
        const candidates = res.results || [];

        const baseMatchInfo = {
          inputTitle: input,
          searchTitle: parsed.searchTitle,
          parsedRating: parsed.parsedRating,
          parsedStatus: parsed.parsedStatus,
          parsedFavorite: parsed.parsedFavorite,
          parsedWatchlistName: parsed.parsedWatchlistName,
          parsedGenreName: parsed.parsedGenreName,
          parsedProviderName: parsed.parsedProviderName,
          parsedDirectUrl: parsed.parsedDirectUrl,
        };

        if (candidates.length === 0) {
          matchResults.push({
            ...baseMatchInfo,
            status: 'not_found',
            confidence: 0,
            selectedMovie: null,
            candidates: [],
          });
        } else if (candidates.length === 1) {
          matchResults.push({
            ...baseMatchInfo,
            status: 'matched',
            confidence: 95,
            selectedMovie: candidates[0],
            candidates,
          });
        } else {
          // Multiple results: check if first is exact match
          const exact = candidates.find(c =>
            c.title.toLowerCase() === parsed.searchTitle.toLowerCase() &&
            (!parsed.parsedYear || (c.release_date && c.release_date.startsWith(parsed.parsedYear.toString())))
          );

          if (exact) {
            matchResults.push({
              ...baseMatchInfo,
              status: 'matched',
              confidence: 90,
              selectedMovie: exact,
              candidates: candidates.slice(0, 5),
            });
          } else {
            matchResults.push({
              ...baseMatchInfo,
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
          searchTitle: parsed.searchTitle,
          parsedRating: parsed.parsedRating,
          parsedStatus: parsed.parsedStatus,
          parsedFavorite: parsed.parsedFavorite,
          parsedWatchlistName: parsed.parsedWatchlistName,
          parsedGenreName: parsed.parsedGenreName,
          parsedProviderName: parsed.parsedProviderName,
          parsedDirectUrl: parsed.parsedDirectUrl,
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
    itemsInput: (number | CommitMovieItem)[],
    options?: {
      watchlistId?: string;
      newWatchlistName?: string;
      customGenreIds?: string[];
      genreId?: string;
      genreIds?: string[];
      watchStatus?: 'unwatched' | 'watching' | 'watched';
      personalRating?: number | null;
      isFavorite?: boolean;
      providerName?: string;
      directUrl?: string;
    }
  ) {
    if (!itemsInput || itemsInput.length === 0) {
      throw new BadRequestError('No approved movies were selected for import.');
    }

    let defaultWatchlistId = options?.watchlistId;
    let defaultWatchlistName: string | undefined;

    if (options?.newWatchlistName && options.newWatchlistName.trim()) {
      const newW = await WatchlistsService.createWatchlist(userId, {
        name: options.newWatchlistName.trim(),
      });
      defaultWatchlistId = newW.id;
      defaultWatchlistName = newW.name;
    } else if (defaultWatchlistId && defaultWatchlistId !== 'none') {
      try {
        const wl = await WatchlistsService.getWatchlistById(userId, defaultWatchlistId);
        defaultWatchlistName = wl.name;
      } catch {
        // ignore invalid watchlist id
      }
    }

    const added: any[] = [];
    const skipped: any[] = [];
    let watchlistAddedCount = 0;
    let ottAddedCount = 0;

    for (const rawItem of itemsInput) {
      const itemObj: CommitMovieItem = typeof rawItem === 'number' ? { tmdbId: rawItem } : rawItem;
      const tmdbId = itemObj.tmdbId ?? itemObj.tmdb_id ?? itemObj.id;
      if (!tmdbId) continue;

      const watchStatus = itemObj.watchStatus ?? itemObj.watch_status ?? options?.watchStatus ?? 'unwatched';
      const personalRating = itemObj.personalRating !== undefined ? itemObj.personalRating : (itemObj.personal_rating !== undefined ? itemObj.personal_rating : (options?.personalRating ?? null));
      const isFavorite = itemObj.isFavorite !== undefined ? itemObj.isFavorite : (itemObj.is_favorite !== undefined ? itemObj.is_favorite : (options?.isFavorite ?? false));
      const targetWlId = itemObj.watchlistId || itemObj.watchlist_id || (defaultWatchlistId !== 'none' ? defaultWatchlistId : undefined);

      let userMovieId: string | null = null;
      try {
        const movie = await MoviesService.addMovie(userId, tmdbId, 'movie', {
          watch_status: watchStatus,
          personal_rating: personalRating,
          is_favorite: isFavorite,
        });
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
            if (userMovieId) {
              await MoviesService.updateMovie(userId, userMovieId, {
                watch_status: watchStatus,
                personal_rating: personalRating,
                is_favorite: isFavorite,
              });
            }
          }
        } else {
          const canonical = Array.from(inMemoryDb.movies.values()).find(m => m.tmdb_id === tmdbId);
          if (canonical) {
            const um = Array.from(inMemoryDb.userMovies.values()).find(
              u => u.user_id === userId && u.movie_id === canonical.id
            );
            if (um) {
              userMovieId = um.id;
              if (userMovieId) {
                await MoviesService.updateMovie(userId, userMovieId, {
                  watch_status: watchStatus,
                  personal_rating: personalRating,
                  is_favorite: isFavorite,
                });
              }
            }
          }
        }
        skipped.push({ tmdbId, reason: err.message });
      }

      if (targetWlId && userMovieId) {
        try {
          await WatchlistsService.addMovieToList(userId, targetWlId, userMovieId);
          watchlistAddedCount++;
        } catch {
          // already in watchlist or not found
        }
      }

      // Attach genres to this movie
      if (userMovieId) {
        const genresToAttach = new Set<string>();

        if (itemObj.genreId) genresToAttach.add(itemObj.genreId);
        if (itemObj.genre_id) genresToAttach.add(itemObj.genre_id);
        if (itemObj.genreName) genresToAttach.add(itemObj.genreName);
        if (itemObj.genre_name) genresToAttach.add(itemObj.genre_name);
        (itemObj.genreIds || itemObj.genre_ids || itemObj.customGenreIds || []).forEach(g => genresToAttach.add(g));

        // If no per-item genre, check global batch options
        if (genresToAttach.size === 0) {
          if (options?.genreId && options.genreId !== 'none') genresToAttach.add(options.genreId);
          (options?.genreIds || options?.customGenreIds || []).forEach(g => genresToAttach.add(g));
        }

        for (const genreIdOrName of genresToAttach) {
          if (!genreIdOrName || genreIdOrName === 'none') continue;
          try {
            await GenresService.attachGenreToMovie(userMovieId, genreIdOrName);
          } catch {
            // Ignore duplicate / invalid genre errors
          }
        }
      }

      // Attach OTT streaming link if present
      const targetUrl = itemObj.directUrl || itemObj.direct_url || itemObj.ottUrl || itemObj.ott_url || options?.directUrl;
      const rawProvider = itemObj.providerName || itemObj.provider_name || options?.providerName || 'Streaming Service';

      if (targetUrl && userMovieId) {
        const realProviderName = detectProviderFromUrl(targetUrl, rawProvider);
        try {
          await SourcesService.addSource(userId, {
            userMovieId,
            sourceType: 'ott',
            providerName: realProviderName,
            externalUrl: targetUrl,
            quality: '4K UHD',
          });
          ottAddedCount++;
        } catch {
          // Ignore source addition errors
        }
      }
    }

    return {
      success: true,
      addedCount: added.length,
      skippedCount: skipped.length,
      watchlistId: defaultWatchlistId,
      watchlistName: defaultWatchlistName,
      watchlistAddedCount,
      ottAddedCount,
      added,
      skipped,
    };
  }
}
