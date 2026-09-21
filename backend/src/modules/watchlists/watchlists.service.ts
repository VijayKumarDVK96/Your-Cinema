import { v4 as uuidv4 } from 'uuid';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export class WatchlistsService {
  static async listUserWatchlists(userId: string, options: { page?: number; limit?: number; parentId?: string | null } = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 50);
    const parentId = options.parentId;

    if (isPgConnected) {
      const conditions = ['w.user_id = $1'];
      const params: any[] = [userId];
      let pIdx = 2;

      if (parentId === 'root' || parentId === 'null') {
        conditions.push('w.parent_id IS NULL');
      } else if (parentId && parentId !== 'all') {
        conditions.push(`w.parent_id = $${pIdx++}`);
        params.push(parentId);
      }

      const countSql = `SELECT COUNT(*)::INT AS total FROM watchlists w WHERE ${conditions.join(' AND ')}`;
      const totalRes = await pool.query(countSql, params.slice(0, pIdx - 1));
      const total = totalRes.rows[0]?.total || 0;

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

      return { watchlists: rows, total, page, limit };
    }

    let userLists = Array.from(inMemoryDb.watchlists.values())
      .filter(w => w.user_id === userId);

    if (parentId === 'root' || parentId === 'null') {
      userLists = userLists.filter(w => !w.parent_id);
    } else if (parentId && parentId !== 'all') {
      userLists = userLists.filter(w => w.parent_id === parentId);
    }

    const total = userLists.length;
    userLists.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    const offset = (page - 1) * limit;
    const paged = userLists.slice(offset, offset + limit);

    const watchlists = paged.map(w => {
      const movieCount = Array.from(inMemoryDb.watchlistMovies.values())
        .filter(wm => wm.watchlist_id === w.id).length;
      const subfolderCount = Array.from(inMemoryDb.watchlists.values())
        .filter(sub => sub.parent_id === w.id).length;
      return { ...w, movie_count: movieCount, subfolder_count: subfolderCount };
    });

    return { watchlists, total, page, limit };
  }

  static async getWatchlistById(userId: string, watchlistId: string) {
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
          m.release_date,
          m.genres,
          wm.sort_order,
          wm.added_at AS in_list_since
        FROM watchlist_movies wm
        JOIN user_movies um ON wm.user_movie_id = um.id
        JOIN movies m ON um.movie_id = m.id
        WHERE wm.watchlist_id = $1
        ORDER BY wm.sort_order ASC, wm.added_at DESC
      `;
      const { rows: movies } = await pool.query(mSql, [watchlistId]);
      return { ...watchlist, ancestors, movies };
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

    const moviesInList = Array.from(inMemoryDb.watchlistMovies.values())
      .filter(wm => wm.watchlist_id === watchlistId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
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
          release_date: m.release_date,
          genres: m.genres || [],
          sort_order: wm.sort_order,
          in_list_since: wm.added_at,
        };
      })
      .filter(Boolean);

    return { ...w, ancestors, movies: moviesInList };
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
}
