import { v4 as uuidv4 } from 'uuid';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const PREDEFINED_GENRES = [
  { id: 'p-28', tmdb_id: 28, name: 'Action', color: '#EF4444', is_predefined: true },
  { id: 'p-12', tmdb_id: 12, name: 'Adventure', color: '#F59E0B', is_predefined: true },
  { id: 'p-16', tmdb_id: 16, name: 'Animation', color: '#EC4899', is_predefined: true },
  { id: 'p-35', tmdb_id: 35, name: 'Comedy', color: '#EAB308', is_predefined: true },
  { id: 'p-80', tmdb_id: 80, name: 'Crime', color: '#64748B', is_predefined: true },
  { id: 'p-99', tmdb_id: 99, name: 'Documentary', color: '#14B8A6', is_predefined: true },
  { id: 'p-18', tmdb_id: 18, name: 'Drama', color: '#8B5CF6', is_predefined: true },
  { id: 'p-10751', tmdb_id: 10751, name: 'Family', color: '#10B981', is_predefined: true },
  { id: 'p-14', tmdb_id: 14, name: 'Fantasy', color: '#A855F7', is_predefined: true },
  { id: 'p-36', tmdb_id: 36, name: 'History', color: '#D97706', is_predefined: true },
  { id: 'p-27', tmdb_id: 27, name: 'Horror', color: '#DC2626', is_predefined: true },
  { id: 'p-10402', tmdb_id: 10402, name: 'Music', color: '#F43F5E', is_predefined: true },
  { id: 'p-9648', tmdb_id: 9648, name: 'Mystery', color: '#6366F1', is_predefined: true },
  { id: 'p-10749', tmdb_id: 10749, name: 'Romance', color: '#F472B6', is_predefined: true },
  { id: 'p-878', tmdb_id: 878, name: 'Science Fiction', color: '#06B6D4', is_predefined: true },
  { id: 'p-53', tmdb_id: 53, name: 'Thriller', color: '#F97316', is_predefined: true },
  { id: 'p-10752', tmdb_id: 10752, name: 'War', color: '#78716C', is_predefined: true },
  { id: 'p-37', tmdb_id: 37, name: 'Western', color: '#B45309', is_predefined: true },
];

export class GenresService {
  static async listGenres(userId: string) {
    // 1. Calculate predefined genre movie counts for this user
    let userMovieGenres: { id?: number; name?: string }[] = [];
    if (isPgConnected) {
      try {
        const { rows } = await pool.query(`
          SELECT m.genres FROM user_movies um
          JOIN movies m ON um.movie_id = m.id
          WHERE um.user_id = $1
        `, [userId]);
        userMovieGenres = rows.flatMap(r => Array.isArray(r.genres) ? r.genres : []);
      } catch {
        // Continue
      }
    } else {
      userMovieGenres = Array.from(inMemoryDb.userMovies.values())
        .filter(um => um.user_id === userId)
        .flatMap(um => {
          const m = inMemoryDb.movies.get(um.movie_id);
          return m && Array.isArray(m.genres) ? m.genres : [];
        });
    }

    const predefined = PREDEFINED_GENRES.map(pg => {
      const count = userMovieGenres.filter(
        g => g.id === pg.tmdb_id || g.name?.toLowerCase() === pg.name.toLowerCase()
      ).length;
      return { ...pg, movie_count: count };
    });

    // 2. Fetch custom genres for user
    let custom: any[] = [];
    if (isPgConnected) {
      try {
        const sql = `
          SELECT cg.id, cg.name, cg.color, cg.description, cg.created_at,
                 COUNT(umcg.user_movie_id)::INT AS movie_count,
                 FALSE AS is_predefined
          FROM custom_genres cg
          LEFT JOIN user_movie_custom_genres umcg ON cg.id = umcg.custom_genre_id
          WHERE cg.user_id = $1
          GROUP BY cg.id, cg.name, cg.color, cg.description, cg.created_at
          ORDER BY cg.name ASC
        `;
        const { rows } = await pool.query(sql, [userId]);
        custom = rows;
      } catch {
        custom = [];
      }
    } else {
      custom = Array.from(inMemoryDb.customGenres.values())
        .filter(cg => cg.user_id === userId)
        .map(cg => {
          const count = Array.from(inMemoryDb.userMovieCustomGenres.values())
            .filter(umcg => umcg.custom_genre_id === cg.id).length;
          return {
            ...cg,
            is_predefined: false,
            movie_count: count,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      predefined,
      custom,
      all: [...predefined, ...custom],
    };
  }

  static async createCustomGenre(userId: string, data: { name: string; color?: string; description?: string }) {
    const trimmed = data.name.trim();
    if (!trimmed) {
      throw new BadRequestError('Genre name cannot be empty.');
    }

    // Check if conflicting with predefined
    if (PREDEFINED_GENRES.some(pg => pg.name.toLowerCase() === trimmed.toLowerCase())) {
      throw new BadRequestError(`"${trimmed}" is already a predefined genre.`);
    }

    // Check if conflicting with user's existing custom genres
    if (isPgConnected) {
      const existing = (await pool.query(
        'SELECT id FROM custom_genres WHERE user_id = $1 AND LOWER(name) = $2',
        [userId, trimmed.toLowerCase()]
      )).rows[0];
      if (existing) {
        throw new BadRequestError('You already have a custom genre with this name.');
      }

      const id = uuidv4();
      const color = data.color || '#38BDF8';
      const { rows } = await pool.query(
        'INSERT INTO custom_genres (id, user_id, name, color, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, userId, trimmed, color, data.description || null]
      );
      return { ...rows[0], is_predefined: false, movie_count: 0 };
    }

    const duplicate = Array.from(inMemoryDb.customGenres.values())
      .find(cg => cg.user_id === userId && cg.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      throw new BadRequestError('You already have a custom genre with this name.');
    }

    const id = `cg-${Date.now()}`;
    const newCg = {
      id,
      user_id: userId,
      name: trimmed,
      color: data.color || '#38BDF8',
      description: data.description || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_predefined: false,
      movie_count: 0,
    };
    inMemoryDb.customGenres.set(id, newCg);
    return newCg;
  }

  static async updateCustomGenre(userId: string, genreId: string, data: { name?: string; color?: string; description?: string }) {
    if (genreId.startsWith('p-') || PREDEFINED_GENRES.some(pg => pg.id === genreId)) {
      throw new BadRequestError('Predefined genres cannot be modified.');
    }

    if (data.name) {
      const trimmed = data.name.trim();
      if (PREDEFINED_GENRES.some(pg => pg.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new BadRequestError(`"${trimmed}" is already a predefined genre.`);
      }
    }

    if (isPgConnected) {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.name !== undefined) {
        fields.push(`name = $${idx++}`);
        values.push(data.name.trim());
      }
      if (data.color !== undefined) {
        fields.push(`color = $${idx++}`);
        values.push(data.color);
      }
      if (data.description !== undefined) {
        fields.push(`description = $${idx++}`);
        values.push(data.description);
      }
      fields.push(`updated_at = NOW()`);
      values.push(genreId, userId);

      const { rows } = await pool.query(
        `UPDATE custom_genres SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
        values
      );
      if (rows.length === 0) throw new NotFoundError('Custom genre not found.');
      return { ...rows[0], is_predefined: false };
    }

    const cg = inMemoryDb.customGenres.get(genreId);
    if (!cg || cg.user_id !== userId) throw new NotFoundError('Custom genre not found.');

    if (data.name !== undefined) cg.name = data.name.trim();
    if (data.color !== undefined) cg.color = data.color;
    if (data.description !== undefined) cg.description = data.description;
    cg.updated_at = new Date().toISOString();

    inMemoryDb.customGenres.set(genreId, cg);
    return { ...cg, is_predefined: false };
  }

  static async deleteCustomGenre(userId: string, genreId: string) {
    if (genreId.startsWith('p-') || PREDEFINED_GENRES.some(pg => pg.id === genreId)) {
      throw new BadRequestError('Predefined genres cannot be deleted.');
    }

    if (isPgConnected) {
      const result = await pool.query('DELETE FROM custom_genres WHERE id = $1 AND user_id = $2', [genreId, userId]);
      if (result.rowCount === 0) throw new NotFoundError('Custom genre not found.');
      return { success: true };
    }

    const cg = inMemoryDb.customGenres.get(genreId);
    if (!cg || cg.user_id !== userId) throw new NotFoundError('Custom genre not found.');

    inMemoryDb.customGenres.delete(genreId);
    // Remove links
    for (const [key, val] of inMemoryDb.userMovieCustomGenres.entries()) {
      if (val.custom_genre_id === genreId) {
        inMemoryDb.userMovieCustomGenres.delete(key);
      }
    }
    return { success: true };
  }

  static async clearAllCustomGenres(userId: string) {
    if (isPgConnected) {
      try {
        await pool.query(`
          DELETE FROM user_movie_custom_genres
          WHERE custom_genre_id IN (SELECT id FROM custom_genres WHERE user_id = $1)
        `, [userId]);
        await pool.query(`
          DELETE FROM custom_genres WHERE user_id = $1
        `, [userId]);
      } catch {
        // Continue gracefully
      }
      return { success: true };
    }

    const customGenresToDelete = Array.from(inMemoryDb.customGenres.values())
      .filter(cg => cg.user_id === userId);

    for (const cg of customGenresToDelete) {
      inMemoryDb.customGenres.delete(cg.id);
      for (const [key, val] of inMemoryDb.userMovieCustomGenres.entries()) {
        if (val.custom_genre_id === cg.id) {
          inMemoryDb.userMovieCustomGenres.delete(key);
        }
      }
    }
    return { success: true };
  }

  static async getMovieCustomGenres(userMovieId: string) {
    if (isPgConnected) {
      const { rows } = await pool.query(`
        SELECT cg.id, cg.name, cg.color, cg.description, FALSE AS is_predefined
        FROM custom_genres cg
        JOIN user_movie_custom_genres umcg ON cg.id = umcg.custom_genre_id
        WHERE umcg.user_movie_id = $1
        ORDER BY cg.name ASC
      `, [userMovieId]);
      return rows;
    }

    return Array.from(inMemoryDb.userMovieCustomGenres.values())
      .filter(umcg => umcg.user_movie_id === userMovieId)
      .map(umcg => {
        const cg = inMemoryDb.customGenres.get(umcg.custom_genre_id);
        return cg ? { id: cg.id, name: cg.name, color: cg.color, description: cg.description, is_predefined: false } : null;
      })
      .filter(Boolean);
  }

  static async attachGenreToMovie(userMovieId: string, genreId: string) {
    if (isPgConnected) {
      await pool.query(`
        INSERT INTO user_movie_custom_genres (user_movie_id, custom_genre_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [userMovieId, genreId]);
      return { success: true };
    }

    const key = `${userMovieId}-${genreId}`;
    inMemoryDb.userMovieCustomGenres.set(key, { user_movie_id: userMovieId, custom_genre_id: genreId });
    return { success: true };
  }

  static async detachGenreFromMovie(userMovieId: string, genreId: string) {
    if (isPgConnected) {
      await pool.query(`
        DELETE FROM user_movie_custom_genres
        WHERE user_movie_id = $1 AND custom_genre_id = $2
      `, [userMovieId, genreId]);
      return { success: true };
    }

    const key = `${userMovieId}-${genreId}`;
    inMemoryDb.userMovieCustomGenres.delete(key);
    return { success: true };
  }
}
