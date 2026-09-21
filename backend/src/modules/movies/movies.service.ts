import { v4 as uuidv4 } from 'uuid';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';
import { TmdbService } from '../tmdb/tmdb.service.js';
import { WatchlistsService } from '../watchlists/watchlists.service.js';
import { GenresService, PREDEFINED_GENRES } from '../genres/genres.service.js';
import { TagsService } from '../tags/tags.service.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export function resolveMovieSingleGenre(row: any, customGenreObj?: any, customGenresList?: any[]) {
  const excluded = Array.isArray(row.excluded_genres) ? row.excluded_genres : [];
  const rawGenres = Array.isArray(row.genres) ? row.genres : [];
  const filteredGenres = rawGenres.filter(
    (g: any) => !excluded.some((ex: string) => ex.toLowerCase() === (g.name || '').toLowerCase() || ex === String(g.id))
  );

  let finalGenres: any[] = [];
  let finalCustomGenres: any[] = customGenresList || (customGenreObj ? [customGenreObj] : []);

  if (row.assigned_genre === '') {
    // Explicitly removed
    finalGenres = [];
    finalCustomGenres = [];
  } else if (row.assigned_genre) {
    const pg = PREDEFINED_GENRES.find(p => p.name.toLowerCase() === row.assigned_genre.toLowerCase());
    if (pg) {
      finalGenres = [{ id: pg.id, name: pg.name, color: pg.color, is_predefined: true }];
      finalCustomGenres = [];
    } else {
      const cg = (customGenresList || []).find(c => c.name.toLowerCase() === row.assigned_genre.toLowerCase())
        || (customGenreObj && customGenreObj.name.toLowerCase() === row.assigned_genre.toLowerCase() ? customGenreObj : null);
      if (cg) {
        finalGenres = [cg];
        finalCustomGenres = [cg];
      } else {
        finalGenres = [{ id: row.assigned_genre, name: row.assigned_genre, color: '#38BDF8', is_predefined: true }];
      }
    }
  } else if (finalCustomGenres.length > 0) {
    finalGenres = [finalCustomGenres[0]];
  } else if (filteredGenres.length > 0) {
    const first = filteredGenres[0];
    const pg = PREDEFINED_GENRES.find(p => p.name.toLowerCase() === (first.name || '').toLowerCase() || String(p.tmdb_id) === String(first.id));
    finalGenres = [{
      id: pg?.id || first.id || first.name,
      name: first.name,
      color: pg?.color || '#38BDF8',
      is_predefined: true,
    }];
  }

  return { genres: finalGenres, custom_genres: finalCustomGenres };
}

export interface MovieFilters {
  status?: 'all' | 'unwatched' | 'watching' | 'watched';
  genreId?: number | string;
  tagId?: string;
  ott?: string;
  language?: string;
  yearMin?: number;
  yearMax?: number;
  runtimeMin?: number;
  runtimeMax?: number;
  ratingMin?: number;
  ratingMax?: number;
  personalRating?: string;
  isFavorite?: boolean;
  mediaType?: 'all' | 'movie' | 'tv';
  search?: string;
  sortBy?: 'added_at' | 'release_date' | 'rating' | 'my_rating' | 'tmdb_rating' | 'runtime' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class MoviesService {
  static async getUserMovies(userId: string, filters: MovieFilters = {}) {
    const {
      status = 'all',
      genreId,
      tagId,
      ott,
      language,
      yearMin,
      yearMax,
      runtimeMin,
      runtimeMax,
      ratingMin,
      ratingMax,
      personalRating,
      isFavorite,
      mediaType = 'all',
      search,
      sortBy = 'added_at',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = filters;

    if (isPgConnected) {
      const conditions: string[] = ['um.user_id = $1'];
      const params: any[] = [userId];
      let pIdx = 2;

      if (status && status !== 'all') {
        conditions.push(`um.watch_status = $${pIdx++}`);
        params.push(status);
      }
      if (mediaType && mediaType !== 'all') {
        conditions.push(`(COALESCE(um.media_type, m.media_type, 'movie') = $${pIdx++})`);
        params.push(mediaType);
      }
      if (isFavorite !== undefined) {
        conditions.push(`um.is_favorite = $${pIdx++}`);
        params.push(isFavorite);
      }
      if (ratingMin) {
        conditions.push(`um.personal_rating >= $${pIdx++}`);
        params.push(ratingMin);
      }
      if (ratingMax) {
        conditions.push(`um.personal_rating <= $${pIdx++}`);
        params.push(ratingMax);
      }
      if (personalRating) {
        if (personalRating === 'rated') {
          conditions.push(`um.personal_rating IS NOT NULL AND um.personal_rating > 0`);
        } else if (personalRating === 'unrated') {
          conditions.push(`(um.personal_rating IS NULL OR um.personal_rating = 0)`);
        } else if (!isNaN(parseFloat(personalRating))) {
          conditions.push(`um.personal_rating >= $${pIdx++}`);
          params.push(parseFloat(personalRating));
        }
      }
      if (language) {
        conditions.push(`COALESCE(m.original_language, '') = $${pIdx++}`);
        params.push(language);
      }
      if (yearMin) {
        conditions.push(`SUBSTRING(m.release_date FROM 1 FOR 4)::INT >= $${pIdx++}`);
        params.push(yearMin);
      }
      if (yearMax) {
        conditions.push(`SUBSTRING(m.release_date FROM 1 FOR 4)::INT <= $${pIdx++}`);
        params.push(yearMax);
      }
      if (runtimeMin) {
        conditions.push(`COALESCE(um.custom_runtime, m.runtime) >= $${pIdx++}`);
        params.push(runtimeMin);
      }
      if (runtimeMax) {
        conditions.push(`COALESCE(um.custom_runtime, m.runtime) <= $${pIdx++}`);
        params.push(runtimeMax);
      }
      if (search && search.trim()) {
        const queryTerm = `%${search.trim().toLowerCase()}%`;
        conditions.push(`(
          LOWER(COALESCE(um.custom_title, m.title)) LIKE $${pIdx} OR
          LOWER(COALESCE(um.custom_director, m.director, '')) LIKE $${pIdx} OR
          LOWER(COALESCE(m.overview, '')) LIKE $${pIdx}
        )`);
        params.push(queryTerm);
        pIdx++;
      }
      if (ott && ott !== 'all') {
        if (ott === 'any_ott') {
          conditions.push(`EXISTS (
            SELECT 1 FROM movie_sources ms
            WHERE ms.user_movie_id = um.id
          )`);
        } else {
          const ottLower = ott.toLowerCase();
          const searchTokens: string[] = [ottLower];
          if (ottLower.includes('sun')) searchTokens.push('sunnxt', 'sun_nxt', 'sun nxt');
          else if (ottLower.includes('prime') || ottLower.includes('amazon')) searchTokens.push('prime', 'amazon');
          else if (ottLower.includes('hotstar') || ottLower.includes('disney')) searchTokens.push('hotstar', 'disney', 'jiohotstar');
          else if (ottLower.includes('apple')) searchTokens.push('apple', 'appletv');
          else if (ottLower.includes('jio')) searchTokens.push('jio', 'jiocinema');
          else if (ottLower.includes('zee')) searchTokens.push('zee5', 'zee');
          else if (ottLower.includes('sony')) searchTokens.push('sonyliv', 'sony liv');
          else if (ottLower.includes('vi')) searchTokens.push('vimovies', 'vi movies', 'vodafone');
          else if (ottLower.includes('drive')) searchTokens.push('drive', 'google_drive');
          else if (ottLower.includes('aha')) searchTokens.push('aha');

          const clauses: string[] = [];
          searchTokens.forEach(token => {
            clauses.push(`LOWER(ms.provider_name) LIKE $${pIdx}`);
            clauses.push(`LOWER(COALESCE(ms.provider_icon, '')) LIKE $${pIdx}`);
            params.push(`%${token}%`);
            pIdx++;
          });

          conditions.push(`EXISTS (
            SELECT 1 FROM movie_sources ms
            WHERE ms.user_movie_id = um.id AND (${clauses.join(' OR ')})
          )`);
        }
      }
      if (genreId !== undefined && genreId !== null && String(genreId).trim() !== '') {
        const gidStr = String(genreId).trim();
        const pgMatch = PREDEFINED_GENRES.find(
          pg => pg.id === gidStr || String(pg.tmdb_id) === gidStr || pg.name.toLowerCase() === gidStr.toLowerCase()
        );
        const matchName = pgMatch ? pgMatch.name : gidStr;

        conditions.push(`(
          LOWER(um.assigned_genre) = LOWER($${pIdx})
          OR (
            um.assigned_genre IS NULL AND (
              EXISTS (
                SELECT 1 FROM user_movie_custom_genres umcg
                JOIN custom_genres cg ON cg.id = umcg.custom_genre_id
                WHERE umcg.user_movie_id = um.id AND (
                  cg.id::text = $${pIdx} OR LOWER(cg.name) = LOWER($${pIdx})
                )
              )
              OR (
                NOT EXISTS (SELECT 1 FROM user_movie_custom_genres WHERE user_movie_id = um.id)
                AND (
                  (m.genres->0->>'id' = $${pIdx} OR LOWER(m.genres->0->>'name') = LOWER($${pIdx}))
                  AND NOT (LOWER(m.genres->0->>'name') = ANY(COALESCE(um.excluded_genres, ARRAY[]::TEXT[])))
                  AND NOT (m.genres->0->>'id' = ANY(COALESCE(um.excluded_genres, ARRAY[]::TEXT[])))
                )
              )
            )
          )
        )`);
        params.push(matchName);
        pIdx++;
      }
      if (tagId && String(tagId).trim() !== '') {
        conditions.push(`EXISTS (
          SELECT 1 FROM user_movie_tags umt
          WHERE umt.user_movie_id = um.id AND (
            umt.tag_id::text = $${pIdx} OR
            umt.tag_id::text IN (SELECT id::text FROM tags WHERE user_id = $1 AND LOWER(name) = LOWER($${pIdx}))
          )
        )`);
        params.push(String(tagId).trim());
        pIdx++;
      }

      const sortMap: Record<string, string> = {
        added_at: 'um.added_at',
        release_date: 'm.release_date',
        rating: 'um.personal_rating',
        my_rating: 'um.personal_rating',
        tmdb_rating: 'm.vote_average',
        runtime: 'COALESCE(um.custom_runtime, m.runtime)',
        title: 'COALESCE(um.custom_title, m.title)',
      };
      const sortColumn = sortMap[sortBy] || 'um.added_at';
      const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';

      const offset = (page - 1) * limit;

      const sql = `
        SELECT
          um.id AS user_movie_id,
          um.watch_status,
          um.personal_rating,
          um.is_favorite,
          um.personal_notes,
          um.assigned_genre,
          (
            SELECT json_build_object('id', cg.id, 'name', cg.name, 'color', cg.color, 'description', cg.description, 'is_predefined', false)
            FROM custom_genres cg
            JOIN user_movie_custom_genres umcg ON cg.id = umcg.custom_genre_id
            WHERE umcg.user_movie_id = um.id
            LIMIT 1
          ) AS custom_genre,
          COALESCE(um.excluded_genres, ARRAY[]::TEXT[]) AS excluded_genres,
          COALESCE(mpp.last_played_position_sec, um.playback_position_sec, 0) AS playback_position_sec,
          mpp.last_played_time_formatted,
          COALESCE(mpp.last_played_at, um.last_watched_at) AS last_watched_at,
          mpp.source_type AS last_played_source_type,
          mpp.source_id AS last_played_source_id,
          um.added_at,
          COALESCE(um.media_type, m.media_type, 'movie') AS media_type,
          COALESCE(m.number_of_seasons, 1) AS number_of_seasons,
          COALESCE(m.number_of_episodes, 1) AS number_of_episodes,
          COALESCE(um.current_season, 1) AS current_season,
          COALESCE(um.current_episode, 1) AS current_episode,
          m.series_status,
          COALESCE(m.created_by, '[]'::jsonb) AS created_by,
          COALESCE(m.seasons, '[]'::jsonb) AS seasons,
          COALESCE(um.custom_title, m.title) AS title,
          COALESCE(um.custom_overview, m.overview) AS overview,
          COALESCE(um.custom_poster_url, m.poster_path) AS poster_path,
          COALESCE(um.custom_backdrop_url, m.backdrop_path) AS backdrop_path,
          COALESCE(um.custom_runtime, m.runtime) AS runtime,
          COALESCE(um.custom_director, m.director) AS director,
          m.id AS movie_id,
          m.tmdb_id,
          m.original_title,
          m.release_date,
          m.original_language,
          m.vote_average,
          m.genres,
          m.cast_members,
          m.trailer_url,
          COALESCE(
            (
              SELECT json_agg(json_build_object(
                'id', ms.id,
                'user_movie_id', ms.user_movie_id,
                'source_type', ms.source_type,
                'provider_name', ms.provider_name,
                'provider_icon', ms.provider_icon,
                'external_url', ms.external_url,
                'quality', ms.quality
              ))
              FROM movie_sources ms
              WHERE ms.user_movie_id = um.id
            ),
            '[]'::json
          ) AS sources
        FROM user_movies um
        JOIN movies m ON um.movie_id = m.id
        LEFT JOIN movie_playback_progress mpp ON mpp.user_movie_id = um.id AND mpp.user_id = um.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortColumn} ${direction} NULLS LAST
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;

      params.push(limit, offset);
      const { rows } = await pool.query(sql, params);
      const cleanedRows = rows.map(r => {
        const { genres, custom_genres } = resolveMovieSingleGenre(r, r.custom_genre);
        return {
          ...r,
          genres,
          custom_genres,
        };
      });
      return { movies: cleanedRows, total: cleanedRows.length, page, limit };
    }

    // In-Memory resilient fallback query
    let userMoviesList = Array.from(inMemoryDb.userMovies.values())
      .filter(um => um.user_id === userId);

    if (status && status !== 'all') {
      userMoviesList = userMoviesList.filter(um => um.watch_status === status);
    }
    if (isFavorite !== undefined) {
      userMoviesList = userMoviesList.filter(um => um.is_favorite === isFavorite);
    }
    if (ratingMin) {
      userMoviesList = userMoviesList.filter(um => (um.personal_rating || 0) >= ratingMin);
    }
    if (ratingMax) {
      userMoviesList = userMoviesList.filter(um => (um.personal_rating || 0) <= ratingMax);
    }
    if (personalRating) {
      if (personalRating === 'rated') {
        userMoviesList = userMoviesList.filter(um => um.personal_rating !== null && um.personal_rating !== undefined && Number(um.personal_rating) > 0);
      } else if (personalRating === 'unrated') {
        userMoviesList = userMoviesList.filter(um => um.personal_rating === null || um.personal_rating === undefined || Number(um.personal_rating) === 0);
      } else if (!isNaN(parseFloat(personalRating))) {
        const minVal = parseFloat(personalRating);
        userMoviesList = userMoviesList.filter(um => (Number(um.personal_rating) || 0) >= minVal);
      }
    }

    const resolved = userMoviesList.map(um => {
      const m = inMemoryDb.movies.get(um.movie_id) || {};
      const movieTags = Array.from(inMemoryDb.userMovieTags.values())
        .filter(umt => umt.user_movie_id === um.id)
        .map(umt => inMemoryDb.tags.get(umt.tag_id))
        .filter(Boolean);

      const movieSources = Array.from(inMemoryDb.movieSources.values())
        .filter(s => s.user_movie_id === um.id);

      const prog = inMemoryDb.moviePlaybackProgress.get(um.id);

      return {
        user_movie_id: um.id,
        watch_status: um.watch_status,
        personal_rating: um.personal_rating,
        is_favorite: um.is_favorite,
        personal_notes: um.personal_notes,
        playback_position_sec: prog ? prog.last_played_position_sec : (um.playback_position_sec || 0),
        last_played_time_formatted: prog ? prog.last_played_time_formatted : null,
        last_watched_at: prog ? prog.last_played_at : um.last_watched_at,
        last_played_source_type: prog ? prog.source_type : null,
        last_played_source_id: prog ? prog.source_id : null,
        added_at: um.added_at,
        media_type: um.media_type || m.media_type || 'movie',
        number_of_seasons: m.number_of_seasons || 1,
        number_of_episodes: m.number_of_episodes || 1,
        current_season: um.current_season || 1,
        current_episode: um.current_episode || 1,
        series_status: m.series_status,
        created_by: m.created_by || [],
        seasons: m.seasons || [],
        title: um.custom_title || m.title,
        overview: um.custom_overview || m.overview,
        poster_path: um.custom_poster_url || m.poster_path,
        backdrop_path: um.custom_backdrop_url || m.backdrop_path,
        runtime: um.custom_runtime || m.runtime,
        director: um.custom_director || m.director,
        movie_id: m.id,
        tmdb_id: m.tmdb_id,
        original_title: m.original_title,
        release_date: m.release_date,
        original_language: m.original_language,
        vote_average: m.vote_average,
        genres: m.genres || [],
        cast_members: m.cast_members || [],
        tags: movieTags,
        sources: movieSources,
        trailer_url: m.trailer_url,
      };
    });

    let filtered = resolved;
    if (mediaType && mediaType !== 'all') {
      filtered = filtered.filter(m => (m.media_type || 'movie') === mediaType);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.director && m.director.toLowerCase().includes(q)) ||
        (m.overview && m.overview.toLowerCase().includes(q))
      );
    }
    if (language) {
      filtered = filtered.filter(m => m.original_language === language);
    }
    if (yearMin) {
      filtered = filtered.filter(m => m.release_date && parseInt(m.release_date.substring(0, 4), 10) >= yearMin);
    }
    if (yearMax) {
      filtered = filtered.filter(m => m.release_date && parseInt(m.release_date.substring(0, 4), 10) <= yearMax);
    }
    if (runtimeMin) {
      filtered = filtered.filter(m => (m.runtime || 0) >= runtimeMin);
    }
    if (runtimeMax) {
      filtered = filtered.filter(m => (m.runtime || 0) <= runtimeMax);
    }
    if (ott && ott !== 'all') {
      const ottLower = ott.toLowerCase();
      filtered = filtered.filter(m => {
        const sources = m.sources || [];
        if (ott === 'any_ott') return sources.length > 0;
        return sources.some((s: any) => {
          const pName = (s.provider_name || '').toLowerCase();
          const pIcon = (s.provider_icon || '').toLowerCase();
          if (ottLower.includes('sun')) return pName.includes('sun') || pIcon.includes('sun');
          if (ottLower.includes('prime') || ottLower.includes('amazon')) return pName.includes('prime') || pName.includes('amazon') || pIcon.includes('prime');
          if (ottLower.includes('hotstar') || ottLower.includes('jiohotstar') || ottLower.includes('disney')) return pName.includes('hotstar') || pName.includes('jiohotstar') || pName.includes('disney') || pIcon.includes('hotstar');
          if (ottLower.includes('apple')) return pName.includes('apple') || pIcon.includes('apple');
          if (ottLower.includes('jio')) return pName.includes('jio') || pIcon.includes('jio');
          if (ottLower.includes('zee')) return pName.includes('zee') || pIcon.includes('zee');
          if (ottLower.includes('sony')) return pName.includes('sony') || pIcon.includes('sony');
          if (ottLower.includes('vi')) return pName.includes('vi') || pIcon.includes('vi');
          if (ottLower.includes('aha')) return pName.includes('aha') || pIcon.includes('aha');
          if (ottLower.includes('drive')) return pName.includes('drive') || pIcon.includes('drive');
          return pName.includes(ottLower) || pIcon.includes(ottLower);
        });
      });
    }
    if (genreId !== undefined && genreId !== null && String(genreId).trim() !== '') {
      const gidStr = String(genreId).trim().toLowerCase();
      filtered = filtered.filter(m =>
        (m.genres || []).some((g: any) => String(g.id) === gidStr || (g.name && g.name.toLowerCase() === gidStr)) ||
        ((m as any).custom_genres || []).some((cg: any) => String(cg.id) === gidStr || (cg.name && cg.name.toLowerCase() === gidStr))
      );
    }
    if (tagId) {
      filtered = filtered.filter(m => (m.tags || []).some((t: any) => String(t.id) === String(tagId) || (t.name && t.name.toLowerCase() === String(tagId).toLowerCase())));
    }

    filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === 'my_rating' || sortBy === 'rating') {
        valA = a.personal_rating ?? -1;
        valB = b.personal_rating ?? -1;
      } else if (sortBy === 'tmdb_rating') {
        valA = a.vote_average ?? -1;
        valB = b.vote_average ?? -1;
      } else if (sortBy === 'release_date') {
        valA = a.release_date || '';
        valB = b.release_date || '';
      } else if (sortBy === 'title') {
        valA = (a.title || '').toLowerCase();
        valB = (b.title || '').toLowerCase();
      } else if (sortBy === 'runtime') {
        valA = a.runtime || 0;
        valB = b.runtime || 0;
      } else {
        valA = a.added_at || '';
        valB = b.added_at || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return { movies: filtered, total: filtered.length, page, limit };
  }

  static async getMovieById(userId: string, userMovieId: string) {
    if (isPgConnected) {
      const sql = `
        SELECT
          um.id AS user_movie_id,
          um.watch_status,
          um.personal_rating,
          um.is_favorite,
          um.personal_notes,
          um.assigned_genre,
          COALESCE(um.excluded_genres, ARRAY[]::TEXT[]) AS excluded_genres,
          um.custom_title,
          um.custom_overview,
          um.custom_poster_url,
          um.custom_backdrop_url,
          um.custom_runtime,
          um.custom_director,
          um.is_customized,
          COALESCE(mpp.last_played_position_sec, um.playback_position_sec, 0) AS playback_position_sec,
          mpp.last_played_time_formatted,
          COALESCE(mpp.last_played_at, um.last_watched_at) AS last_watched_at,
          mpp.source_type AS last_played_source_type,
          mpp.source_id AS last_played_source_id,
          um.added_at,
          COALESCE(um.media_type, m.media_type, 'movie') AS media_type,
          COALESCE(m.number_of_seasons, 1) AS number_of_seasons,
          COALESCE(m.number_of_episodes, 1) AS number_of_episodes,
          COALESCE(um.current_season, 1) AS current_season,
          COALESCE(um.current_episode, 1) AS current_episode,
          m.first_air_date,
          m.last_air_date,
          m.series_status,
          COALESCE(m.created_by, '[]'::jsonb) AS created_by,
          COALESCE(m.seasons, '[]'::jsonb) AS seasons,
          m.id AS movie_id,
          m.tmdb_id,
          m.imdb_id,
          m.title AS tmdb_title,
          m.original_title,
          m.overview AS tmdb_overview,
          m.release_date,
          m.runtime AS tmdb_runtime,
          m.original_language,
          m.spoken_languages,
          m.poster_path AS tmdb_poster_path,
          m.backdrop_path AS tmdb_backdrop_path,
          m.vote_average,
          m.director AS tmdb_director,
          m.cast_members,
          m.crew_members,
          m.genres,
          m.keywords,
          m.production_countries,
          m.trailer_url
        FROM user_movies um
        JOIN movies m ON um.movie_id = m.id
        LEFT JOIN movie_playback_progress mpp ON mpp.user_movie_id = um.id AND mpp.user_id = um.user_id
        WHERE um.id = $1 AND um.user_id = $2
      `;
      const { rows } = await pool.query(sql, [userMovieId, userId]);
      if (rows.length === 0) throw new NotFoundError('Movie not found in your library.');

      const item = rows[0];
      let sources = (await pool.query('SELECT * FROM movie_sources WHERE user_movie_id = $1', [userMovieId])).rows;
      



      const tags = (await pool.query(`
        SELECT t.id, t.name, t.color
        FROM tags t
        JOIN user_movie_tags umt ON t.id = umt.tag_id
        WHERE umt.user_movie_id = $1
      `, [userMovieId])).rows;

      const cast = Array.isArray(item.cast_members) ? item.cast_members : [];
      let crew = Array.isArray(item.crew_members) ? item.crew_members : [];

      const titleLower = (item.custom_title || item.tmdb_title || '').toLowerCase();
      if (titleLower.includes('greatest of all time') || titleLower === 'goat') {
        if (crew.length === 0) {
          crew = [
            { name: 'Venkat Prabhu', job: 'Director', department: 'Directing' },
            { name: 'Yuvan Shankar Raja', job: 'Original Music Composer', department: 'Sound' },
            { name: 'Siddhartha Nuni', job: 'Director of Photography', department: 'Camera' },
            { name: 'Venkat Raajen', job: 'Editor', department: 'Editing' },
            { name: 'Venkat Prabhu', job: 'Writer', department: 'Writing' },
            { name: 'Kalpathi S. Aghoram', job: 'Producer', department: 'Production' },
            { name: 'Rajeevan', job: 'Production Design', department: 'Art' },
            { name: 'Dileep Subbarayan', job: 'Stunt Coordinator', department: 'Crew' },
          ];
        }
      }

      const directorName = item.custom_director || item.tmdb_director;
      if (directorName && !crew.some((c: any) => c.job === 'Director')) {
        crew.unshift({ name: directorName, job: 'Director', department: 'Directing' });
      }

      let customGenres: any[] = [];
      try {
        const cgRows = (await pool.query(`
          SELECT cg.id, cg.name, cg.color, cg.description, FALSE AS is_predefined
          FROM custom_genres cg
          JOIN user_movie_custom_genres umcg ON cg.id = umcg.custom_genre_id
          WHERE umcg.user_movie_id = $1
          ORDER BY cg.name ASC
        `, [userMovieId])).rows;
        customGenres = cgRows;
      } catch {
        customGenres = [];
      }

      const { genres: resolvedGenres, custom_genres: resolvedCustomGenres } = resolveMovieSingleGenre(item, undefined, customGenres);

      return {
        ...item,
        genres: resolvedGenres,
        title: item.custom_title || item.tmdb_title,
        overview: item.custom_overview || item.tmdb_overview,
        poster_path: item.custom_poster_url || item.tmdb_poster_path,
        backdrop_path: item.custom_backdrop_url || item.tmdb_backdrop_path,
        runtime: item.custom_runtime || item.tmdb_runtime,
        director: directorName,
        cast_members: cast,
        crew_members: crew,
        sources,
        tags,
        custom_genres: resolvedCustomGenres,
      };
    }

    const um = inMemoryDb.userMovies.get(userMovieId);
    if (!um || um.user_id !== userId) throw new NotFoundError('Movie not found in your library.');
    const m = inMemoryDb.movies.get(um.movie_id);
    if (!m) throw new NotFoundError('Canonical movie metadata not found.');

    let sources = Array.from(inMemoryDb.movieSources.values()).filter(s => s.user_movie_id === userMovieId);
    


    const tags = Array.from(inMemoryDb.userMovieTags.values())
      .filter(umt => umt.user_movie_id === userMovieId)
      .map(umt => inMemoryDb.tags.get(umt.tag_id))
      .filter(Boolean);

    const customGenres = Array.from(inMemoryDb.userMovieCustomGenres.values())
      .filter(umcg => umcg.user_movie_id === userMovieId)
      .map(umcg => inMemoryDb.customGenres.get(umcg.custom_genre_id))
      .filter(Boolean);

    const titleLower = (um.custom_title || m.title || '').toLowerCase();
    let crew = Array.isArray(m.crew_members) ? m.crew_members : [];
    let cast = Array.isArray(m.cast_members) ? m.cast_members : [];

    if (titleLower.includes('greatest of all time') || titleLower === 'goat') {
      if (crew.length === 0) {
        crew = [
          { name: 'Venkat Prabhu', job: 'Director', department: 'Directing' },
          { name: 'Yuvan Shankar Raja', job: 'Original Music Composer', department: 'Sound' },
          { name: 'Siddhartha Nuni', job: 'Director of Photography', department: 'Camera' },
          { name: 'Venkat Raajen', job: 'Editor', department: 'Editing' },
          { name: 'Venkat Prabhu', job: 'Writer', department: 'Writing' },
          { name: 'Kalpathi S. Aghoram', job: 'Producer', department: 'Production' },
          { name: 'Rajeevan', job: 'Production Design', department: 'Art' },
          { name: 'Dileep Subbarayan', job: 'Stunt Coordinator', department: 'Crew' },
        ];
      }
      if (cast.length <= 2) {
        cast = [
          { name: 'Vijay', character: 'Gandhi / Jeevan', profile_path: null },
          { name: 'Prashanth', character: 'Sunil Thiagarajan', profile_path: null },
          { name: 'Prabhu Deva', character: 'Kalyan Sundaram', profile_path: null },
          { name: 'Sneha', character: 'Anuradha Gandhi', profile_path: null },
          { name: 'Meenakshi Chaudhary', character: 'Srinidhi', profile_path: null },
          { name: 'Mohan', character: 'Rajiv Menon', profile_path: null },
          { name: 'Jayaram', character: 'Nazeer', profile_path: null },
          { name: 'Ajmal Ameer', character: 'Ajay', profile_path: null },
          { name: 'Vaibhav', character: 'Diamond Babu', profile_path: null },
          { name: 'Premgi Amaren', character: 'Seenu', profile_path: null },
        ];
      }
    }

    const directorName = um.custom_director || m.director;
    if (directorName && !crew.some((c: any) => c.job === 'Director')) {
      crew.unshift({ name: directorName, job: 'Director', department: 'Directing' });
    }

    return {
      user_movie_id: um.id,
      watch_status: um.watch_status,
      personal_rating: um.personal_rating,
      is_favorite: um.is_favorite,
      personal_notes: um.personal_notes,
      custom_title: um.custom_title,
      custom_overview: um.custom_overview,
      custom_poster_url: um.custom_poster_url,
      custom_backdrop_url: um.custom_backdrop_url,
      custom_runtime: um.custom_runtime,
      custom_director: um.custom_director,
      is_customized: um.is_customized,
      playback_position_sec: inMemoryDb.moviePlaybackProgress.get(userMovieId)?.last_played_position_sec ?? um.playback_position_sec ?? 0,
      last_played_time_formatted: inMemoryDb.moviePlaybackProgress.get(userMovieId)?.last_played_time_formatted ?? null,
      last_watched_at: inMemoryDb.moviePlaybackProgress.get(userMovieId)?.last_played_at ?? um.last_watched_at,
      last_played_source_type: inMemoryDb.moviePlaybackProgress.get(userMovieId)?.source_type ?? null,
      last_played_source_id: inMemoryDb.moviePlaybackProgress.get(userMovieId)?.source_id ?? null,
      added_at: um.added_at,
      media_type: um.media_type || m.media_type || 'movie',
      number_of_seasons: m.number_of_seasons || 1,
      number_of_episodes: m.number_of_episodes || 1,
      current_season: um.current_season || 1,
      current_episode: um.current_episode || 1,
      series_status: m.series_status,
      first_air_date: m.first_air_date,
      last_air_date: m.last_air_date,
      created_by: m.created_by || (m.director ? [{ id: 1, name: m.director, profile_path: null }] : []),
      seasons: m.seasons || [],
      movie_id: m.id,
      tmdb_id: m.tmdb_id,
      imdb_id: m.imdb_id,
      tmdb_title: m.title,
      original_title: m.original_title,
      tmdb_overview: m.overview,
      release_date: m.release_date,
      tmdb_runtime: m.runtime,
      original_language: m.original_language,
      spoken_languages: m.spoken_languages,
      tmdb_poster_path: m.poster_path,
      tmdb_backdrop_path: m.backdrop_path,
      vote_average: m.vote_average,
      tmdb_director: m.director,
      cast_members: cast,
      crew_members: crew,
      genres: m.genres,
      keywords: m.keywords,
      production_countries: m.production_countries,
      trailer_url: m.trailer_url,
      title: um.custom_title || m.title,
      overview: um.custom_overview || m.overview,
      poster_path: um.custom_poster_url || m.poster_path,
      backdrop_path: um.custom_backdrop_url || m.backdrop_path,
      runtime: um.custom_runtime || m.runtime,
      director: directorName,
      sources,
      tags,
      custom_genres: customGenres,
    };
  }

  static async addMovie(
    userId: string,
    tmdbId: number,
    mediaType: 'movie' | 'tv' = 'movie',
    initialData?: {
      watch_status?: 'unwatched' | 'watching' | 'watched';
      personal_rating?: number | null;
      is_favorite?: boolean;
    }
  ) {
    let canonicalMovie: any;

    const initialStatus = initialData?.watch_status || 'unwatched';
    const initialRating = initialData?.personal_rating ?? null;
    const initialFav = initialData?.is_favorite ?? false;
    const initialLastWatched = initialStatus === 'watched' ? new Date().toISOString() : null;

    if (isPgConnected) {
      const existingMovie = (await pool.query('SELECT * FROM movies WHERE tmdb_id = $1', [tmdbId])).rows[0];
      if (existingMovie) {
        canonicalMovie = existingMovie;
      } else {
        const enriched = await TmdbService.getMediaDetails(tmdbId, mediaType);
        const newId = uuidv4();
        await pool.query(`
          INSERT INTO movies (
            id, tmdb_id, imdb_id, title, original_title, overview, release_date,
            runtime, original_language, spoken_languages, poster_path, backdrop_path,
            vote_average, director, cast_members, crew_members, genres, keywords,
            production_countries, trailer_url, media_type, number_of_seasons, number_of_episodes,
            first_air_date, last_air_date, series_status, created_by, seasons
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
        `, [
          newId, enriched.tmdb_id, enriched.imdb_id, enriched.title, enriched.original_title,
          enriched.overview, enriched.release_date, enriched.runtime, enriched.original_language,
          enriched.spoken_languages, enriched.poster_path, enriched.backdrop_path,
          enriched.vote_average, enriched.director, JSON.stringify(enriched.cast_members),
          JSON.stringify(enriched.crew_members || []), JSON.stringify(enriched.genres),
          enriched.keywords, enriched.production_countries, enriched.trailer_url,
          enriched.media_type || mediaType, enriched.number_of_seasons || 1, enriched.number_of_episodes || 1,
          enriched.first_air_date || null, enriched.last_air_date || null, enriched.series_status || null,
          JSON.stringify(enriched.created_by || []), JSON.stringify(enriched.seasons || [])
        ]);
        canonicalMovie = { id: newId, ...enriched };
      }

      // Check if user already owns it
      const alreadyInLibrary = (await pool.query(
        'SELECT id FROM user_movies WHERE user_id = $1 AND movie_id = $2',
        [userId, canonicalMovie.id]
      )).rows[0];

      if (alreadyInLibrary) {
        if (initialData) {
          await this.updateMovie(userId, alreadyInLibrary.id, {
            watch_status: initialData.watch_status,
            personal_rating: initialData.personal_rating,
            is_favorite: initialData.is_favorite,
          });
        }
        return this.getMovieById(userId, alreadyInLibrary.id);
      }

      const userMovieId = uuidv4();
      await pool.query(`
        INSERT INTO user_movies (id, user_id, movie_id, watch_status, personal_rating, is_favorite, last_watched_at, media_type, current_season, current_episode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, 1)
      `, [userMovieId, userId, canonicalMovie.id, initialStatus, initialRating, initialFav, initialLastWatched, canonicalMovie.media_type || mediaType]);

      return this.getMovieById(userId, userMovieId);
    }

    // In-memory fallback
    canonicalMovie = Array.from(inMemoryDb.movies.values()).find(m => m.tmdb_id === tmdbId && (m.media_type || 'movie') === mediaType) ||
      Array.from(inMemoryDb.movies.values()).find(m => m.tmdb_id === tmdbId);
    if (!canonicalMovie) {
      const enriched = await TmdbService.getMediaDetails(tmdbId, mediaType);
      canonicalMovie = { id: `m-${tmdbId}`, ...enriched };
      inMemoryDb.movies.set(canonicalMovie.id, canonicalMovie);
    }

    const duplicate = Array.from(inMemoryDb.userMovies.values())
      .find(um => um.user_id === userId && um.movie_id === canonicalMovie.id);

    if (duplicate) {
      if (initialData) {
        await this.updateMovie(userId, duplicate.id, {
          watch_status: initialData.watch_status,
          personal_rating: initialData.personal_rating,
          is_favorite: initialData.is_favorite,
        });
      }
      return this.getMovieById(userId, duplicate.id);
    }

    const newUmId = `um-${Date.now()}`;
    const newUm = {
      id: newUmId,
      user_id: userId,
      movie_id: canonicalMovie.id,
      media_type: canonicalMovie.media_type || mediaType,
      current_season: 1,
      current_episode: 1,
      watch_status: initialStatus,
      personal_rating: initialRating,
      is_favorite: initialFav,
      personal_notes: null,
      custom_title: null,
      custom_overview: null,
      custom_poster_url: null,
      custom_backdrop_url: null,
      custom_runtime: null,
      custom_director: null,
      is_customized: false,
      playback_position_sec: 0,
      last_watched_at: initialLastWatched,
      added_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryDb.userMovies.set(newUmId, newUm);

    return this.getMovieById(userId, newUmId);
  }

  static async updateMovie(userId: string, userMovieId: string, updates: Partial<{
    watch_status: 'unwatched' | 'watching' | 'watched';
    personal_rating: number | null;
    is_favorite: boolean;
    personal_notes: string | null;
    custom_title: string | null;
    custom_overview: string | null;
    custom_poster_url: string | null;
    custom_backdrop_url: string | null;
    custom_runtime: number | null;
    custom_director: string | null;
    trailer_url: string | null;
    original_language: string | null;
    language: string | null;
    custom_language: string | null;
    playback_position_sec: number;
    current_season: number;
    current_episode: number;
  }>) {
    const { trailer_url, original_language, language, custom_language, ...umUpdates } = updates;
    const langVal = original_language || language || custom_language;

    if (isPgConnected) {
      if (trailer_url !== undefined) {
        await pool.query(
          `UPDATE movies SET trailer_url = $1 WHERE id = (SELECT movie_id FROM user_movies WHERE id = $2 AND user_id = $3)`,
          [trailer_url, userMovieId, userId]
        );
      }

      if (langVal !== undefined && langVal !== null) {
        await pool.query(
          `UPDATE movies SET original_language = $1 WHERE id = (SELECT movie_id FROM user_movies WHERE id = $2 AND user_id = $3)`,
          [langVal, userMovieId, userId]
        );
      }

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      Object.entries(umUpdates).forEach(([key, val]) => {
        if (val !== undefined) {
          fields.push(`${key} = $${idx++}`);
          values.push(val);
        }
      });

      if (fields.length > 0) {
        // If user customized any textual or artwork field, mark is_customized = true
        const hasContentCustomization = [
          'custom_title', 'custom_overview', 'custom_poster_url',
          'custom_backdrop_url', 'custom_runtime', 'custom_director'
        ].some(k => k in umUpdates && (umUpdates as any)[k] !== null);

        if (hasContentCustomization) {
          fields.push(`is_customized = true`);
        }

        // If marked watched, update last_watched_at
        if (umUpdates.watch_status === 'watched') {
          fields.push(`last_watched_at = NOW()`);
        }

        fields.push(`updated_at = NOW()`);
        values.push(userMovieId, userId);

        await pool.query(
          `UPDATE user_movies SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`,
          values
        );
      }

      return this.getMovieById(userId, userMovieId);
    }

    const um = inMemoryDb.userMovies.get(userMovieId);
    if (!um || um.user_id !== userId) throw new NotFoundError('Movie not found in your library.');

    if (trailer_url !== undefined || langVal !== undefined) {
      const m = inMemoryDb.movies.get(um.movie_id);
      if (m) {
        if (trailer_url !== undefined) m.trailer_url = trailer_url;
        if (langVal !== undefined && langVal !== null) m.original_language = langVal;
        inMemoryDb.movies.set(m.id, m);
      }
    }

    Object.assign(um, umUpdates, { updated_at: new Date().toISOString() });
    if (umUpdates.watch_status === 'watched') {
      um.last_watched_at = new Date().toISOString();
    }
    const hasCustom = ['custom_title', 'custom_overview', 'custom_poster_url', 'custom_backdrop_url', 'custom_runtime', 'custom_director']
      .some(k => (umUpdates as any)[k] !== undefined && (umUpdates as any)[k] !== null);
    if (hasCustom) um.is_customized = true;

    inMemoryDb.userMovies.set(userMovieId, um);
    return this.getMovieById(userId, userMovieId);
  }

  static async deleteMovie(userId: string, userMovieId: string) {
    if (isPgConnected) {
      const result = await pool.query('DELETE FROM user_movies WHERE id = $1 AND user_id = $2', [userMovieId, userId]);
      if (result.rowCount === 0) throw new NotFoundError('Movie not found in your library.');
      return { success: true };
    }

    const um = inMemoryDb.userMovies.get(userMovieId);
    if (!um || um.user_id !== userId) throw new NotFoundError('Movie not found in your library.');
    inMemoryDb.userMovies.delete(userMovieId);
    inMemoryDb.moviePlaybackProgress.delete(userMovieId);
    return { success: true };
  }

  static async clearAllUserMovies(userId: string) {
    // 1. Remove all watchlists and watchlist associations for this user
    await WatchlistsService.clearAllUserWatchlists(userId);

    // 2. Remove all custom genres created by this user
    await GenresService.clearAllCustomGenres(userId);

    if (isPgConnected) {
      // 3. Remove movie custom genres associations
      try {
        await pool.query(`
          DELETE FROM user_movie_custom_genres
          WHERE user_movie_id IN (SELECT id FROM user_movies WHERE user_id = $1)
        `, [userId]);
      } catch {
        // Continue gracefully if table is empty or missing
      }

      // 3. Remove movie tags associations
      try {
        await pool.query(`
          DELETE FROM user_movie_tags
          WHERE user_movie_id IN (SELECT id FROM user_movies WHERE user_id = $1)
        `, [userId]);
      } catch {
        // Continue gracefully
      }

      // 4. Remove movie streaming/file sources
      try {
        await pool.query(`
          DELETE FROM movie_sources
          WHERE user_movie_id IN (SELECT id FROM user_movies WHERE user_id = $1)
        `, [userId]);
      } catch {
        // Continue gracefully
      }

      // 5. Remove all user movies
      const result = await pool.query('DELETE FROM user_movies WHERE user_id = $1', [userId]);
      return { success: true, count: result.rowCount || 0 };
    }

    // In-memory cleanup
    const userMoviesToDelete = Array.from(inMemoryDb.userMovies.values())
      .filter(um => um.user_id === userId);

    for (const um of userMoviesToDelete) {
      inMemoryDb.userMovies.delete(um.id);
      inMemoryDb.moviePlaybackProgress.delete(um.id);
      for (const [key, val] of inMemoryDb.userMovieTags.entries()) {
        if (val.user_movie_id === um.id) inMemoryDb.userMovieTags.delete(key);
      }
      for (const [key, val] of inMemoryDb.watchlistMovies.entries()) {
        if (val.user_movie_id === um.id) inMemoryDb.watchlistMovies.delete(key);
      }
      for (const [key, val] of inMemoryDb.movieSources.entries()) {
        if (val.user_movie_id === um.id) inMemoryDb.movieSources.delete(key);
      }
      for (const [key, val] of inMemoryDb.userMovieCustomGenres.entries()) {
        if (val.user_movie_id === um.id) inMemoryDb.userMovieCustomGenres.delete(key);
      }
    }
    return { success: true, count: userMoviesToDelete.length };
  }

  static async getTmdbRefreshDiff(userId: string, userMovieId: string) {
    const current = await this.getMovieById(userId, userMovieId);
    const freshTmdb = await TmdbService.getMovieDetails(current.tmdb_id);

    return {
      user_movie_id: userMovieId,
      tmdb_id: current.tmdb_id,
      fields: {
        title: {
          current: current.title,
          tmdb: freshTmdb.title,
          isOverridden: !!current.custom_title,
        },
        overview: {
          current: current.overview,
          tmdb: freshTmdb.overview,
          isOverridden: !!current.custom_overview,
        },
        runtime: {
          current: current.runtime,
          tmdb: freshTmdb.runtime,
          isOverridden: !!current.custom_runtime,
        },
        director: {
          current: current.director,
          tmdb: freshTmdb.director,
          isOverridden: !!current.custom_director,
        },
        poster_path: {
          current: current.poster_path,
          tmdb: freshTmdb.poster_path,
          isOverridden: !!current.custom_poster_url,
        },
      },
    };
  }

  static async applyTmdbRefresh(userId: string, userMovieId: string, options: {
    selectedFields: string[];
    fullOverwrite: boolean;
  }) {
    const current = await this.getMovieById(userId, userMovieId);
    const freshTmdb = await TmdbService.getMovieDetails(current.tmdb_id);

    if (options.fullOverwrite) {
      // Clear all custom overrides
      return this.updateMovie(userId, userMovieId, {
        custom_title: null,
        custom_overview: null,
        custom_poster_url: null,
        custom_backdrop_url: null,
        custom_runtime: null,
        custom_director: null,
      });
    }

    const updates: any = {};
    if (options.selectedFields.includes('title')) updates.custom_title = freshTmdb.title;
    if (options.selectedFields.includes('overview')) updates.custom_overview = freshTmdb.overview;
    if (options.selectedFields.includes('runtime')) updates.custom_runtime = freshTmdb.runtime;
    if (options.selectedFields.includes('director')) updates.custom_director = freshTmdb.director;
    if (options.selectedFields.includes('poster_path')) updates.custom_poster_url = freshTmdb.poster_path;

    return this.updateMovie(userId, userMovieId, updates);
  }

    action: 'mark_watched' | 'mark_unwatched' | 'favorite' | 'unfavorite' | 'delete' | 'add_tag' | 'remove_tag' | 'add_genre' | 'remove_genre' | 'add_to_watchlist' | 'edit_tags_genres' | 'edit_language';
    tagId?: string;
    tagIds?: string[];
    genreId?: string;
    genreIds?: string[];
    language?: string;
    original_language?: string;
    watchlistId?: string;
    newWatchlistName?: string;
    mode?: 'add' | 'remove';
  }) {
    const { movieIds, action, tagId, tagIds, genreId, genreIds, watchlistId, newWatchlistName, mode = 'add' } = data;
    const lang = data.language || data.original_language;

    if (!movieIds || movieIds.length === 0) {
      throw new BadRequestError('No movies selected for bulk action.');
    }

    if (action === 'delete') {
      for (const id of movieIds) {
        await this.deleteMovie(userId, id);
      }
    } else if (action === 'mark_watched') {
      for (const id of movieIds) {
        await this.updateMovie(userId, id, { watch_status: 'watched' });
      }
    } else if (action === 'mark_unwatched') {
      for (const id of movieIds) {
        await this.updateMovie(userId, id, { watch_status: 'unwatched' });
      }
    } else if (action === 'favorite') {
      for (const id of movieIds) {
        await this.updateMovie(userId, id, { is_favorite: true });
      }
    } else if (action === 'unfavorite') {
      for (const id of movieIds) {
        await this.updateMovie(userId, id, { is_favorite: false });
      }
    } else if (action === 'edit_language' && lang) {
      for (const id of movieIds) {
        await this.updateMovie(userId, id, { original_language: lang });
      }
    } else if (action === 'add_tag' && tagId) {
      for (const id of movieIds) {
        await TagsService.attachTagToMovie(id, tagId);
      }
    } else if (action === 'remove_tag' && tagId) {
      for (const id of movieIds) {
        await TagsService.detachTagFromMovie(id, tagId);
      }
    } else if (action === 'add_genre' && genreId) {
      for (const id of movieIds) {
        await GenresService.attachGenreToMovie(id, genreId);
      }
    } else if (action === 'remove_genre' && genreId) {
      for (const id of movieIds) {
        await GenresService.detachGenreFromMovie(id, genreId);
      }
    } else if (action === 'edit_tags_genres') {
      const isRemove = mode === 'remove';
      for (const id of movieIds) {
        if (isRemove) {
          if (tagIds && tagIds.length > 0) {
            for (const tid of tagIds) {
              await TagsService.detachTagFromMovie(id, tid);
            }
          }
          if (genreIds && genreIds.length > 0) {
            for (const gid of genreIds) {
              await GenresService.detachGenreFromMovie(id, gid);
            }
          }
        } else {
          if (tagIds && tagIds.length > 0) {
            for (const tid of tagIds) {
              await TagsService.attachTagToMovie(id, tid);
            }
          }
          if (genreIds && genreIds.length > 0) {
            for (const gid of genreIds) {
              await GenresService.attachGenreToMovie(id, gid);
            }
          }
        }
      }
    } else if (action === 'add_to_watchlist') {
      let targetWatchlistId = watchlistId;
      if (newWatchlistName && newWatchlistName.trim()) {
        const nw = await WatchlistsService.createWatchlist(userId, { name: newWatchlistName.trim() });
        targetWatchlistId = nw.id;
      }
      if (targetWatchlistId) {
        for (const id of movieIds) {
          try {
            await WatchlistsService.addMovieToList(userId, targetWatchlistId, id);
          } catch {
            // ignore duplicates or already in list
          }
        }
      }
    }

    return { success: true, count: movieIds.length, watchlistId: data.watchlistId };
  }
}
