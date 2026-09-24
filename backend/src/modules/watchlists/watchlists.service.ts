import { v4 as uuidv4 } from 'uuid';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { PREDEFINED_GENRES } from '../genres/genres.service.js';

export class WatchlistsService {
  static async getUnassignedCounts(userId: string): Promise<{ movie_count: number; series_count: number }> {
    if (isPgConnected) {
      const sql = `
        SELECT
          COUNT(CASE WHEN COALESCE(um.media_type, m.media_type, 'movie') = 'movie' THEN 1 END)::INT AS movie_count,
          COUNT(CASE WHEN COALESCE(um.media_type, m.media_type, 'movie') = 'tv' THEN 1 END)::INT AS series_count
        FROM user_movies um
        JOIN movies m ON um.movie_id = m.id
        WHERE um.user_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM watchlist_movies wm WHERE wm.user_movie_id = um.id
        )
      `;
      const res = await pool.query(sql, [userId]);
      return {
        movie_count: res.rows[0]?.movie_count || 0,
        series_count: res.rows[0]?.series_count || 0,
      };
    }

    const assignedIds = new Set(Array.from(inMemoryDb.watchlistMovies.values()).map(wm => wm.user_movie_id));
    const unassigned = Array.from(inMemoryDb.userMovies.values()).filter(um => um.user_id === userId && !assignedIds.has(um.id));
    let movie_count = 0;
    let series_count = 0;
    for (const um of unassigned) {
      const m = inMemoryDb.movies.get(um.movie_id);
      const mType = um.media_type || m?.media_type || 'movie';
      if (mType === 'tv') series_count++;
      else movie_count++;
    }
    return { movie_count, series_count };
  }

  static async listUserWatchlists(userId: string, options: { page?: number; limit?: number; parentId?: string | null } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 50);
    const parentId = options.parentId;

    const isRoot = parentId === 'root' || parentId === 'null';

    let watchlists: any[] = [];
    let total = 0;

    if (isPgConnected) {
      const conditions = ['w.user_id = $1'];
      const params: any[] = [userId];
      let pIdx = 2;

      if (isRoot) {
        conditions.push('w.parent_id IS NULL');
      } else if (parentId && parentId !== 'all') {
        conditions.push(`w.parent_id = $${pIdx++}`);
        params.push(parentId);
      }

      const countSql = `SELECT COUNT(*)::INT AS total FROM watchlists w WHERE ${conditions.join(' AND ')}`;
      const totalRes = await pool.query(countSql, params.slice(0, pIdx - 1));
      total = totalRes.rows[0]?.total || 0;

      const offset = (page - 1) * limit;

      const listSql = `
        SELECT
          w.id,
          w.user_id,
          w.parent_id,
          w.name,
          w.description,
          w.cover_image_url,
          w.is_smart,
          w.smart_criteria,
          w.display_order,
          w.created_at,
          w.updated_at,
          COUNT(DISTINCT wm.user_movie_id)::INT AS movie_count,
          COUNT(DISTINCT sub.id)::INT AS subfolder_count
        FROM watchlists w
        LEFT JOIN watchlist_movies wm ON w.id = wm.watchlist_id
        LEFT JOIN watchlists sub ON w.id = sub.parent_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY w.id
        ORDER BY w.display_order ASC, w.created_at DESC
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;
      params.push(limit, offset);
      const { rows } = await pool.query(listSql, params);
      watchlists = rows;
    } else {
      let userLists = Array.from(inMemoryDb.watchlists.values())
        .filter(w => w.user_id === userId);

      if (isRoot) {
        userLists = userLists.filter(w => !w.parent_id);
      } else if (parentId && parentId !== 'all') {
        userLists = userLists.filter(w => w.parent_id === parentId);
      }

      total = userLists.length;
      userLists.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      const offset = (page - 1) * limit;
      const paged = userLists.slice(offset, offset + limit);

      watchlists = paged.map(w => {
        const movieCount = Array.from(inMemoryDb.watchlistMovies.values())
          .filter(wm => wm.watchlist_id === w.id).length;
        const subfolderCount = Array.from(inMemoryDb.watchlists.values())
          .filter(sub => sub.parent_id === w.id).length;
        return { ...w, movie_count: movieCount, subfolder_count: subfolderCount };
      });
    }

    if (isRoot && page === 1) {
      const counts = await this.getUnassignedCounts(userId);
      const unassignedMoviesFolder = {
        id: 'unassigned-movies',
        user_id: userId,
        parent_id: null,
        name: 'Unassigned Movies',
        description: 'Movie titles not added to any folder or collection',
        cover_image_url: null,
        is_smart: false,
        is_system: true,
        system_type: 'movies',
        is_readonly: true,
        movie_count: counts.movie_count,
        subfolder_count: 0,
        display_order: -1000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const unassignedSeriesFolder = {
        id: 'unassigned-series',
        user_id: userId,
        parent_id: null,
        name: 'Unassigned Web Series',
        description: 'Web series & TV shows not added to any folder or collection',
        cover_image_url: null,
        is_smart: false,
        is_system: true,
        system_type: 'series',
        is_readonly: true,
        movie_count: counts.series_count,
        subfolder_count: 0,
        display_order: -999,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      watchlists = [unassignedMoviesFolder, unassignedSeriesFolder, ...watchlists];
      total += 2;
    }

    return { watchlists, total, page, limit };
  }

  static async getWatchlistById(
    userId: string,
    watchlistId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      mediaType?: 'all' | 'movie' | 'tv';
      genreId?: string | number;
      tagId?: string;
      ott?: string;
      language?: string;
      ratingMin?: number;
      ratingMax?: number;
      yearMin?: number;
      yearMax?: number;
      isFavorite?: boolean;
      search?: string;
      sortBy?: string;
    } = {}
  ) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 50);
    const offset = (page - 1) * limit;

    const {
      status = 'all',
      mediaType = 'all',
      genreId,
      tagId,
      ott,
      language,
      ratingMin,
      ratingMax,
      yearMin,
      yearMax,
      isFavorite,
      search,
      sortBy = 'added_at',
    } = options;

    const isUnassignedMovies = watchlistId === 'unassigned' || watchlistId === 'unassigned-movies';
    const isUnassignedSeries = watchlistId === 'unassigned-series';
    const isSystemQueue = isUnassignedMovies || isUnassignedSeries;

    if (isSystemQueue) {
      const defaultTargetType = isUnassignedSeries ? 'tv' : 'movie';
      const effectiveMediaType = mediaType !== 'all' ? mediaType : defaultTargetType;

      if (isPgConnected) {
        const conditions: string[] = ['um.user_id = $1'];
        const params: any[] = [userId];
        let pIdx = 2;

        conditions.push(`COALESCE(um.media_type, m.media_type, 'movie') = $${pIdx++}`);
        params.push(effectiveMediaType);

        conditions.push(`NOT EXISTS (SELECT 1 FROM watchlist_movies wm WHERE wm.user_movie_id = um.id)`);

        if (status && status !== 'all') {
          conditions.push(`um.watch_status = $${pIdx++}`);
          params.push(status);
        }
        if (isFavorite !== undefined) {
          conditions.push(`um.is_favorite = $${pIdx++}`);
          params.push(isFavorite);
        }
        if (ratingMin !== undefined) {
          conditions.push(`um.personal_rating >= $${pIdx++}`);
          params.push(ratingMin);
        }
        if (ratingMax !== undefined) {
          conditions.push(`um.personal_rating <= $${pIdx++}`);
          params.push(ratingMax);
        }
        if (yearMin) {
          conditions.push(`SUBSTRING(m.release_date FROM 1 FOR 4)::INT >= $${pIdx++}`);
          params.push(yearMin);
        }
        if (yearMax) {
          conditions.push(`SUBSTRING(m.release_date FROM 1 FOR 4)::INT <= $${pIdx++}`);
          params.push(yearMax);
        }
        if (language) {
          conditions.push(`COALESCE(m.original_language, '') = $${pIdx++}`);
          params.push(language);
        }
        if (search && search.trim()) {
          const queryTerm = search.trim().toLowerCase();
          const searchParamIdx = pIdx++;
          conditions.push(`(
            LOWER(COALESCE(um.custom_title, m.title)) LIKE '%' || $${searchParamIdx} || '%' OR
            LOWER(COALESCE(m.original_title, '')) LIKE '%' || $${searchParamIdx} || '%' OR
            LOWER(COALESCE(um.custom_director, m.director, '')) LIKE '%' || $${searchParamIdx} || '%' OR
            LOWER(COALESCE(m.overview, '')) LIKE '%' || $${searchParamIdx} || '%' OR
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(m.cast_members::jsonb) = 'array' THEN m.cast_members::jsonb ELSE '[]'::jsonb END) cm
              WHERE LOWER(cm->>'name') LIKE '%' || $${searchParamIdx} || '%'
            )
          )`);
          params.push(queryTerm);
        }
        if (ott && ott !== 'all') {
          if (ott === 'unassigned' || ott === 'no_ott' || ott === 'none') {
            conditions.push(`NOT EXISTS (SELECT 1 FROM movie_sources ms WHERE ms.user_movie_id = um.id)`);
          } else if (ott === 'any_ott') {
            conditions.push(`EXISTS (SELECT 1 FROM movie_sources ms WHERE ms.user_movie_id = um.id)`);
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
            else if (ottLower.includes('lionsgate') || ottLower.includes('lions gate')) searchTokens.push('lionsgate', 'lionsgateplay', 'lions gate');

            const clauses: string[] = [];
            searchTokens.forEach(token => {
              clauses.push(`LOWER(ms.provider_name) LIKE $${pIdx}`);
              clauses.push(`LOWER(COALESCE(ms.provider_icon, '')) LIKE $${pIdx}`);
              params.push(`%${token}%`);
              pIdx++;
            });
            conditions.push(`EXISTS (SELECT 1 FROM movie_sources ms WHERE ms.user_movie_id = um.id AND (${clauses.join(' OR ')}))`);
          }
        }
        if (genreId !== undefined && genreId !== null && String(genreId).trim() !== '') {
          const gidStr = String(genreId).trim();
          const pgMatch = PREDEFINED_GENRES.find(
            pg => pg.id === gidStr || String(pg.tmdb_id) === gidStr || pg.name.toLowerCase() === gidStr.toLowerCase()
          );
          const matchName = pgMatch ? pgMatch.name : gidStr;

          conditions.push(`(
            LOWER(COALESCE(um.assigned_genre, '')) = LOWER($${pIdx})
            OR EXISTS (
              SELECT 1 FROM user_movie_custom_genres umcg
              JOIN custom_genres cg ON cg.id = umcg.custom_genre_id
              WHERE umcg.user_movie_id = um.id AND (
                cg.id::text = $${pIdx} OR LOWER(cg.name) = LOWER($${pIdx})
              )
            )
            OR (
              (um.assigned_genre IS NULL OR um.assigned_genre = '') AND
              NOT EXISTS (SELECT 1 FROM user_movie_custom_genres WHERE user_movie_id = um.id) AND
              EXISTS (
                SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(m.genres::jsonb) = 'array' THEN m.genres::jsonb ELSE '[]'::jsonb END) elem
                WHERE (elem->>'id' = $${pIdx} OR LOWER(elem->>'name') = LOWER($${pIdx}))
                  AND NOT (LOWER(elem->>'name') = ANY(COALESCE(um.excluded_genres, ARRAY[]::TEXT[])))
                  AND NOT (elem->>'id' = ANY(COALESCE(um.excluded_genres, ARRAY[]::TEXT[])))
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

        const countSql = `
          SELECT COUNT(*)::INT AS total
          FROM user_movies um
          JOIN movies m ON um.movie_id = m.id
          WHERE ${conditions.join(' AND ')}
        `;
        const countRes = await pool.query(countSql, params);
        const total = countRes.rows[0]?.total || 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        const sortMap: Record<string, string> = {
          added_at: 'um.added_at DESC',
          release_date: 'm.release_date DESC',
          rating: 'um.personal_rating DESC',
          my_rating: 'um.personal_rating DESC',
          tmdb_rating: 'm.vote_average DESC',
          runtime: 'COALESCE(um.custom_runtime, m.runtime) DESC',
          title: 'COALESCE(um.custom_title, m.title) ASC',
        };
        const orderClause = sortMap[sortBy] || 'um.added_at DESC';

        const mSql = `
          SELECT
            um.id AS user_movie_id,
            um.watch_status,
            um.personal_rating,
            um.is_favorite,
            COALESCE(um.custom_title, m.title) AS title,
            COALESCE(um.custom_poster_url, m.poster_path) AS poster_path,
            COALESCE(um.custom_backdrop_url, m.backdrop_path) AS backdrop_path,
            COALESCE(um.custom_runtime, m.runtime) AS runtime,
            COALESCE(um.custom_director, m.director) AS director,
            COALESCE(um.media_type, m.media_type, 'movie') AS media_type,
            m.release_date,
            m.genres,
            0 AS sort_order,
            um.added_at AS in_list_since
          FROM user_movies um
          JOIN movies m ON um.movie_id = m.id
          WHERE ${conditions.join(' AND ')}
          ORDER BY ${orderClause}
          LIMIT $${pIdx++} OFFSET $${pIdx++}
        `;
        params.push(limit, offset);
        const res = await pool.query(mSql, params);
        const movies = res.rows;

        return {
          id: isUnassignedSeries ? 'unassigned-series' : 'unassigned-movies',
          user_id: userId,
          parent_id: null,
          name: isUnassignedSeries ? 'Unassigned Web Series' : 'Unassigned Movies',
          description: isUnassignedSeries
            ? 'Web series & TV shows not added to any folder or collection'
            : 'Movie titles not added to any folder or collection',
          is_system: true,
          system_type: isUnassignedSeries ? 'series' : 'movies',
          is_readonly: true,
          movie_count: total,
          total,
          page,
          limit,
          totalPages,
          ancestors: [],
          movies,
        };
      } else {
        const assignedIds = new Set(Array.from(inMemoryDb.watchlistMovies.values()).map(wm => wm.user_movie_id));
        let allUnassigned = Array.from(inMemoryDb.userMovies.values())
          .filter(um => {
            if (um.user_id !== userId || assignedIds.has(um.id)) return false;
            const m = inMemoryDb.movies.get(um.movie_id);
            const mType = um.media_type || m?.media_type || 'movie';
            if (mType !== effectiveMediaType) return false;
            if (status !== 'all' && um.watch_status !== status) return false;
            if (isFavorite !== undefined && um.is_favorite !== isFavorite) return false;
            if (ratingMin !== undefined && (um.personal_rating || 0) < ratingMin) return false;
            if (ratingMax !== undefined && (um.personal_rating || 0) > ratingMax) return false;
            if (yearMin && m?.release_date && parseInt(m.release_date.substring(0, 4), 10) < yearMin) return false;
            if (yearMax && m?.release_date && parseInt(m.release_date.substring(0, 4), 10) > yearMax) return false;
            if (language && m?.original_language !== language) return false;
            if (search && search.trim()) {
              const q = search.trim().toLowerCase();
              const title = (um.custom_title || m?.title || '').toLowerCase();
              if (!title.includes(q)) return false;
            }
            return true;
          })
          .map(um => {
            const m = inMemoryDb.movies.get(um.movie_id) || {};
            return {
              user_movie_id: um.id,
              watch_status: um.watch_status,
              personal_rating: um.personal_rating,
              is_favorite: um.is_favorite,
              title: um.custom_title || m.title,
              poster_path: um.custom_poster_url || m.poster_path,
              backdrop_path: um.custom_backdrop_url || m.backdrop_path,
              runtime: um.custom_runtime || m.runtime,
              director: um.custom_director || m.director,
              media_type: um.media_type || m.media_type || 'movie',
              release_date: m.release_date,
              genres: m.genres || [],
              sort_order: 0,
              in_list_since: um.added_at,
            };
          });

        const total = allUnassigned.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const movies = allUnassigned.slice(offset, offset + limit);

        return {
          id: isUnassignedSeries ? 'unassigned-series' : 'unassigned-movies',
          user_id: userId,
          parent_id: null,
          name: isUnassignedSeries ? 'Unassigned Web Series' : 'Unassigned Movies',
          description: isUnassignedSeries
            ? 'Web series & TV shows not added to any folder or collection'
            : 'Movie titles not added to any folder or collection',
          is_system: true,
          system_type: isUnassignedSeries ? 'series' : 'movies',
          is_readonly: true,
          movie_count: total,
          total,
          page,
          limit,
          totalPages,
          ancestors: [],
          movies,
        };
      }
    }

    if (isPgConnected) {
      const wRows = (await pool.query('SELECT * FROM watchlists WHERE id = $1 AND user_id = $2', [watchlistId, userId])).rows;
      if (wRows.length === 0) throw new NotFoundError('Watchlist not found');
      const watchlist = wRows[0];

      const ancestors: any[] = [];
      let currentParentId = watchlist.parent_id;
      while (currentParentId) {
        const pRes = await pool.query('SELECT id, name, parent_id FROM watchlists WHERE id = $1 AND user_id = $2', [currentParentId, userId]);
        if (pRes.rows.length === 0) break;
        ancestors.unshift(pRes.rows[0]);
        currentParentId = pRes.rows[0].parent_id;
      }

      const conditions: string[] = ['wm.watchlist_id = $1', 'um.user_id = $2'];
      const params: any[] = [watchlistId, userId];
      let pIdx = 3;

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
      if (ratingMin !== undefined) {
        conditions.push(`um.personal_rating >= $${pIdx++}`);
        params.push(ratingMin);
      }
      if (ratingMax !== undefined) {
        conditions.push(`um.personal_rating <= $${pIdx++}`);
        params.push(ratingMax);
      }
      if (yearMin) {
        conditions.push(`SUBSTRING(m.release_date FROM 1 FOR 4)::INT >= $${pIdx++}`);
        params.push(yearMin);
      }
      if (yearMax) {
        conditions.push(`SUBSTRING(m.release_date FROM 1 FOR 4)::INT <= $${pIdx++}`);
        params.push(yearMax);
      }
      if (language) {
        conditions.push(`COALESCE(m.original_language, '') = $${pIdx++}`);
        params.push(language);
      }
      if (search && search.trim()) {
        const queryTerm = search.trim().toLowerCase();
        const searchParamIdx = pIdx++;
        conditions.push(`(
          LOWER(COALESCE(um.custom_title, m.title)) LIKE '%' || $${searchParamIdx} || '%' OR
          LOWER(COALESCE(m.original_title, '')) LIKE '%' || $${searchParamIdx} || '%' OR
          LOWER(COALESCE(um.custom_director, m.director, '')) LIKE '%' || $${searchParamIdx} || '%' OR
          LOWER(COALESCE(m.overview, '')) LIKE '%' || $${searchParamIdx} || '%' OR
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(m.cast_members::jsonb) = 'array' THEN m.cast_members::jsonb ELSE '[]'::jsonb END) cm
            WHERE LOWER(cm->>'name') LIKE '%' || $${searchParamIdx} || '%'
          )
        )`);
        params.push(queryTerm);
      }
      if (ott && ott !== 'all') {
        if (ott === 'unassigned' || ott === 'no_ott' || ott === 'none') {
          conditions.push(`NOT EXISTS (SELECT 1 FROM movie_sources ms WHERE ms.user_movie_id = um.id)`);
        } else if (ott === 'any_ott') {
          conditions.push(`EXISTS (SELECT 1 FROM movie_sources ms WHERE ms.user_movie_id = um.id)`);
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
          else if (ottLower.includes('lionsgate') || ottLower.includes('lions gate')) searchTokens.push('lionsgate', 'lionsgateplay', 'lions gate');

          const clauses: string[] = [];
          searchTokens.forEach(token => {
            clauses.push(`LOWER(ms.provider_name) LIKE $${pIdx}`);
            clauses.push(`LOWER(COALESCE(ms.provider_icon, '')) LIKE $${pIdx}`);
            params.push(`%${token}%`);
            pIdx++;
          });
          conditions.push(`EXISTS (SELECT 1 FROM movie_sources ms WHERE ms.user_movie_id = um.id AND (${clauses.join(' OR ')}))`);
        }
      }
      if (genreId !== undefined && genreId !== null && String(genreId).trim() !== '') {
        const gidStr = String(genreId).trim();
        const pgMatch = PREDEFINED_GENRES.find(
          pg => pg.id === gidStr || String(pg.tmdb_id) === gidStr || pg.name.toLowerCase() === gidStr.toLowerCase()
        );
        const matchName = pgMatch ? pgMatch.name : gidStr;

        conditions.push(`(
          LOWER(COALESCE(um.assigned_genre, '')) = LOWER($${pIdx})
          OR EXISTS (
            SELECT 1 FROM user_movie_custom_genres umcg
            JOIN custom_genres cg ON cg.id = umcg.custom_genre_id
            WHERE umcg.user_movie_id = um.id AND (
              cg.id::text = $${pIdx} OR LOWER(cg.name) = LOWER($${pIdx})
            )
          )
          OR (
            (um.assigned_genre IS NULL OR um.assigned_genre = '') AND
            NOT EXISTS (SELECT 1 FROM user_movie_custom_genres WHERE user_movie_id = um.id) AND
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(m.genres::jsonb) = 'array' THEN m.genres::jsonb ELSE '[]'::jsonb END) elem
              WHERE (elem->>'id' = $${pIdx} OR LOWER(elem->>'name') = LOWER($${pIdx}))
                AND NOT (LOWER(elem->>'name') = ANY(COALESCE(um.excluded_genres, ARRAY[]::TEXT[])))
                AND NOT (elem->>'id' = ANY(COALESCE(um.excluded_genres, ARRAY[]::TEXT[])))
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
            umt.tag_id::text IN (SELECT id::text FROM tags WHERE user_id = $2 AND LOWER(name) = LOWER($${pIdx}))
          )
        )`);
        params.push(String(tagId).trim());
        pIdx++;
      }

      const countSql = `
        SELECT COUNT(*)::INT AS total
        FROM watchlist_movies wm
        JOIN user_movies um ON wm.user_movie_id = um.id
        JOIN movies m ON um.movie_id = m.id
        WHERE ${conditions.join(' AND ')}
      `;
      const countRes = await pool.query(countSql, params);
      const total = countRes.rows[0]?.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / limit));

      const sortMap: Record<string, string> = {
        added_at: 'wm.added_at DESC',
        release_date: 'm.release_date DESC',
        rating: 'um.personal_rating DESC',
        my_rating: 'um.personal_rating DESC',
        tmdb_rating: 'm.vote_average DESC',
        runtime: 'COALESCE(um.custom_runtime, m.runtime) DESC',
        title: 'COALESCE(um.custom_title, m.title) ASC',
        sort_order: 'wm.sort_order ASC, wm.added_at DESC',
      };
      const orderClause = sortMap[sortBy] || 'wm.sort_order ASC, wm.added_at DESC';

      const mSql = `
        SELECT
          um.id AS user_movie_id,
          um.watch_status,
          um.personal_rating,
          um.is_favorite,
          COALESCE(um.custom_title, m.title) AS title,
          COALESCE(um.custom_poster_url, m.poster_path) AS poster_path,
          COALESCE(um.custom_backdrop_url, m.backdrop_path) AS backdrop_path,
          COALESCE(um.custom_runtime, m.runtime) AS runtime,
          COALESCE(um.custom_director, m.director) AS director,
          COALESCE(um.media_type, m.media_type, 'movie') AS media_type,
          m.release_date,
          m.genres,
          wm.sort_order,
          wm.added_at AS in_list_since
        FROM watchlist_movies wm
        JOIN user_movies um ON wm.user_movie_id = um.id
        JOIN movies m ON um.movie_id = m.id
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${orderClause}
        LIMIT $${pIdx++} OFFSET $${pIdx++}
      `;
      params.push(limit, offset);
      const { rows: movies } = await pool.query(mSql, params);
      return { ...watchlist, ancestors, movies, total, page, limit, totalPages };
    }

    const w = inMemoryDb.watchlists.get(watchlistId);
    if (!w || w.user_id !== userId) throw new NotFoundError('Watchlist not found');

    const ancestors: any[] = [];
    let currentParentId = w.parent_id;
    while (currentParentId) {
      const parent = inMemoryDb.watchlists.get(currentParentId);
      if (!parent || parent.user_id !== userId) break;
      ancestors.unshift({ id: parent.id, name: parent.name, parent_id: parent.parent_id });
      currentParentId = parent.parent_id;
    }

    let moviesInList = Array.from(inMemoryDb.watchlistMovies.values())
      .filter(wm => wm.watchlist_id === watchlistId)
      .map(wm => {
        const um = inMemoryDb.userMovies.get(wm.user_movie_id);
        if (!um) return null;
        const m = inMemoryDb.movies.get(um.movie_id) || {};
        return {
          user_movie_id: um.id,
          watch_status: um.watch_status,
          personal_rating: um.personal_rating,
          is_favorite: um.is_favorite,
          title: um.custom_title || m.title,
          poster_path: um.custom_poster_url || m.poster_path,
          backdrop_path: um.custom_backdrop_url || m.backdrop_path,
          runtime: um.custom_runtime || m.runtime,
          director: um.custom_director || m.director,
          media_type: um.media_type || m.media_type || 'movie',
          release_date: m.release_date,
          genres: m.genres || [],
          sort_order: wm.sort_order,
          in_list_since: wm.added_at,
          original_language: m.original_language,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (mediaType !== 'all') {
      moviesInList = moviesInList.filter(m => m.media_type === mediaType);
    }
    if (status !== 'all') {
      moviesInList = moviesInList.filter(m => m.watch_status === status);
    }
    if (isFavorite !== undefined) {
      moviesInList = moviesInList.filter(m => m.is_favorite === isFavorite);
    }
    if (ratingMin !== undefined) {
      moviesInList = moviesInList.filter(m => (m.personal_rating || 0) >= ratingMin);
    }
    if (ratingMax !== undefined) {
      moviesInList = moviesInList.filter(m => (m.personal_rating || 0) <= ratingMax);
    }
    if (yearMin) {
      moviesInList = moviesInList.filter(m => m.release_date && parseInt(m.release_date.substring(0, 4), 10) >= yearMin);
    }
    if (yearMax) {
      moviesInList = moviesInList.filter(m => m.release_date && parseInt(m.release_date.substring(0, 4), 10) <= yearMax);
    }
    if (language) {
      moviesInList = moviesInList.filter(m => m.original_language === language);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      moviesInList = moviesInList.filter(m => (m.title || '').toLowerCase().includes(q));
    }

    if (sortBy === 'title') {
      moviesInList.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'rating' || sortBy === 'my_rating') {
      moviesInList.sort((a, b) => (b.personal_rating || 0) - (a.personal_rating || 0));
    } else if (sortBy === 'release_date') {
      moviesInList.sort((a, b) => (b.release_date || '').localeCompare(a.release_date || ''));
    } else {
      moviesInList.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }

    const total = moviesInList.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const pagedMovies = moviesInList.slice(offset, offset + limit);

    return { ...w, ancestors, movies: pagedMovies, total, page, limit, totalPages };
  }

  static async createWatchlist(userId: string, data: {
    name: string;
    description?: string;
    cover_image_url?: string;
    parent_id?: string | null;
    is_smart?: boolean;
    smart_criteria?: any;
  }) {
    const listId = uuidv4();
    const parentId = data.parent_id && data.parent_id.trim() ? data.parent_id.trim() : null;

    if (isPgConnected) {
      const { rows } = await pool.query(`
        INSERT INTO watchlists (id, user_id, parent_id, name, description, cover_image_url, is_smart, smart_criteria)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [listId, userId, parentId, data.name.trim(), data.description || null, data.cover_image_url || null, data.is_smart || false, JSON.stringify(data.smart_criteria || {})]);
      return rows[0];
    }

    const newW = {
      id: listId,
      user_id: userId,
      parent_id: parentId,
      name: data.name.trim(),
      description: data.description || null,
      cover_image_url: data.cover_image_url || null,
      is_smart: data.is_smart || false,
      smart_criteria: data.smart_criteria || {},
      display_order: inMemoryDb.watchlists.size + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryDb.watchlists.set(listId, newW);
    return newW;
  }

  static async updateWatchlist(userId: string, watchlistId: string, updates: Partial<{
    name: string;
    description: string;
    cover_image_url: string;
    parent_id: string | null;
    display_order: number;
  }>) {
    if (isPgConnected) {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      Object.entries(updates).forEach(([key, val]) => {
        if (val !== undefined) {
          fields.push(`${key} = $${idx++}`);
          values.push(val);
        }
      });
      fields.push(`updated_at = NOW()`);
      values.push(watchlistId, userId);

      const { rows } = await pool.query(
        `UPDATE watchlists SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
        values
      );
      if (rows.length === 0) throw new NotFoundError('Watchlist not found');
      return rows[0];
    }

    const w = inMemoryDb.watchlists.get(watchlistId);
    if (!w || w.user_id !== userId) throw new NotFoundError('Watchlist not found');
    Object.assign(w, updates, { updated_at: new Date().toISOString() });
    inMemoryDb.watchlists.set(watchlistId, w);
    return w;
  }

  static async deleteWatchlist(userId: string, watchlistId: string) {
    if (isPgConnected) {
      await pool.query('DELETE FROM watchlist_movies WHERE watchlist_id = $1', [watchlistId]);
      const result = await pool.query('DELETE FROM watchlists WHERE id = $1 AND user_id = $2', [watchlistId, userId]);
      if (result.rowCount === 0) throw new NotFoundError('Watchlist not found');
      return { success: true };
    }

    const w = inMemoryDb.watchlists.get(watchlistId);
    if (!w || w.user_id !== userId) throw new NotFoundError('Watchlist not found');
    inMemoryDb.watchlists.delete(watchlistId);
    for (const [key, val] of inMemoryDb.watchlistMovies.entries()) {
      if (val.watchlist_id === watchlistId) {
        inMemoryDb.watchlistMovies.delete(key);
      }
    }
    return { success: true };
  }

  static async clearAllUserWatchlists(userId: string) {
    if (isPgConnected) {
      await pool.query(`
        DELETE FROM watchlist_movies
        WHERE watchlist_id IN (SELECT id FROM watchlists WHERE user_id = $1)
      `, [userId]);
      const result = await pool.query('DELETE FROM watchlists WHERE user_id = $1', [userId]);
      return { success: true, count: result.rowCount || 0 };
    }

    const userLists = Array.from(inMemoryDb.watchlists.values()).filter(w => w.user_id === userId);
    for (const l of userLists) {
      inMemoryDb.watchlists.delete(l.id);
      for (const [key, val] of inMemoryDb.watchlistMovies.entries()) {
        if (val.watchlist_id === l.id) {
          inMemoryDb.watchlistMovies.delete(key);
        }
      }
    }
    return { success: true, count: userLists.length };
  }

  static async addMovieToList(userId: string, watchlistId: string, userMovieId: string) {
    // Verify ownership
    const list = await this.getWatchlistById(userId, watchlistId);

    if (isPgConnected) {
      const junctionId = uuidv4();
      await pool.query(`
        INSERT INTO watchlist_movies (id, watchlist_id, user_movie_id, sort_order)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (watchlist_id, user_movie_id) DO NOTHING
      `, [junctionId, watchlistId, userMovieId, list.movies.length + 1]);
      return { success: true };
    }

    const key = `${watchlistId}-${userMovieId}`;
    inMemoryDb.watchlistMovies.set(key, {
      id: key,
      watchlist_id: watchlistId,
      user_movie_id: userMovieId,
      sort_order: inMemoryDb.watchlistMovies.size + 1,
      added_at: new Date().toISOString(),
    });
    return { success: true };
  }

  static async removeMovieFromList(userId: string, watchlistId: string, userMovieId: string) {
    await this.getWatchlistById(userId, watchlistId);

    if (isPgConnected) {
      await pool.query('DELETE FROM watchlist_movies WHERE watchlist_id = $1 AND user_movie_id = $2', [watchlistId, userMovieId]);
      return { success: true };
    }

    const key = `${watchlistId}-${userMovieId}`;
    inMemoryDb.watchlistMovies.delete(key);
    return { success: true };
  }

  static async bulkMoveMovies(
    userId: string,
    targetWatchlistId: string | null,
    userMovieIds: string[],
    action: 'move' | 'copy' = 'move',
    sourceWatchlistId?: string
  ) {
    if (!userMovieIds || userMovieIds.length === 0) return { success: true, count: 0 };

    if (isPgConnected) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        if (action === 'move') {
          if (sourceWatchlistId && !sourceWatchlistId.startsWith('unassigned')) {
            await client.query(
              `DELETE FROM watchlist_movies WHERE watchlist_id = $1 AND user_movie_id = ANY($2::uuid[])`,
              [sourceWatchlistId, userMovieIds]
            );
          } else {
            // Remove from all watchlists owned by user if moved from unassigned or general
            if (targetWatchlistId && !targetWatchlistId.startsWith('unassigned')) {
              await client.query(
                `DELETE FROM watchlist_movies
                 WHERE user_movie_id = ANY($1::uuid[])
                 AND watchlist_id IN (SELECT id FROM watchlists WHERE user_id = $2)`,
                [userMovieIds, userId]
              );
            }
          }
        }

        if (targetWatchlistId && !targetWatchlistId.startsWith('unassigned')) {
          // Verify target watchlist exists & owned by user
          const tRes = await client.query('SELECT id FROM watchlists WHERE id = $1 AND user_id = $2', [targetWatchlistId, userId]);
          if (tRes.rows.length === 0) throw new NotFoundError('Target watchlist not found');

          for (const umId of userMovieIds) {
            const junctionId = uuidv4();
            await client.query(
              `INSERT INTO watchlist_movies (id, watchlist_id, user_movie_id, sort_order)
               VALUES ($1, $2, $3, 0)
               ON CONFLICT (watchlist_id, user_movie_id) DO NOTHING`,
              [junctionId, targetWatchlistId, umId]
            );
          }
        }

        await client.query('COMMIT');
        return { success: true, count: userMovieIds.length };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else {
      if (action === 'move') {
        if (sourceWatchlistId && !sourceWatchlistId.startsWith('unassigned')) {
          for (const umId of userMovieIds) {
            inMemoryDb.watchlistMovies.delete(`${sourceWatchlistId}-${umId}`);
          }
        } else {
          for (const [key, val] of Array.from(inMemoryDb.watchlistMovies.entries())) {
            if (userMovieIds.includes(val.user_movie_id)) {
              inMemoryDb.watchlistMovies.delete(key);
            }
          }
        }
      }

      if (targetWatchlistId && !targetWatchlistId.startsWith('unassigned')) {
        for (const umId of userMovieIds) {
          const key = `${targetWatchlistId}-${umId}`;
          inMemoryDb.watchlistMovies.set(key, {
            id: key,
            watchlist_id: targetWatchlistId,
            user_movie_id: umId,
            sort_order: 0,
            added_at: new Date().toISOString(),
          });
        }
      }

      return { success: true, count: userMovieIds.length };
    }
  }
}

