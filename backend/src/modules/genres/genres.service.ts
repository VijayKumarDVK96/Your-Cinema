import { v4 as uuidv4 } from 'uuid';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export const PREDEFINED_GENRES = [
  { id: 'p-28', tmdb_id: 28, name: 'Action', color: '#EF4444', is_predefined: true },
  { id: 'p-12', tmdb_id: 12, name: 'Adventure', color: '#F59E0B', is_predefined: true },
  { id: 'p-16', tmdb_id: 16, name: 'Animation', color: '#EC4899', is_predefined: true },
  { id: 'p-35', tmdb_id: 35, name: 'Comedy', color: '#EAB308', is_predefined: true },
  { id: 'p-80', tmdb_id: 80, name: 'Crime', color: '#64748B', is_predefined: true },
  { id: 'p-18', tmdb_id: 18, name: 'Drama', color: '#8B5CF6', is_predefined: true },
  { id: 'p-10751', tmdb_id: 10751, name: 'Family', color: '#10B981', is_predefined: true },
  { id: 'p-14', tmdb_id: 14, name: 'Fantasy', color: '#A855F7', is_predefined: true },
  { id: 'p-36', tmdb_id: 36, name: 'History', color: '#D97706', is_predefined: true },
  { id: 'p-27', tmdb_id: 27, name: 'Horror', color: '#DC2626', is_predefined: true },
  { id: 'p-9648', tmdb_id: 9648, name: 'Mystery', color: '#6366F1', is_predefined: true },
  { id: 'p-878', tmdb_id: 878, name: 'Science Fiction', color: '#06B6D4', is_predefined: true },
  { id: 'p-53', tmdb_id: 53, name: 'Thriller', color: '#F97316', is_predefined: true },
  { id: 'p-10752', tmdb_id: 10752, name: 'War', color: '#78716C', is_predefined: true },
  { id: 'p-c1', tmdb_id: null, name: 'Dark Comedy', color: '#7C3AED', is_predefined: true },
  { id: 'p-c2', tmdb_id: null, name: 'Friendship', color: '#34D399', is_predefined: true },
  { id: 'p-c3', tmdb_id: null, name: 'Gangster', color: '#9CA3AF', is_predefined: true },
  { id: 'p-c4', tmdb_id: null, name: 'Heist', color: '#FBBF24', is_predefined: true },
  { id: 'p-c5', tmdb_id: null, name: 'Love', color: '#F472B6', is_predefined: true },
  { id: 'p-c6', tmdb_id: null, name: 'Motivation', color: '#4ADE80', is_predefined: true },
  { id: 'p-c7', tmdb_id: null, name: 'Politics', color: '#60A5FA', is_predefined: true },
  { id: 'p-c8', tmdb_id: null, name: 'Sports', color: '#FB923C', is_predefined: true },
  { id: 'p-c9', tmdb_id: null, name: 'Super Heroes', color: '#C084FC', is_predefined: true },
  { id: 'p-c10', tmdb_id: null, name: 'Survival', color: '#2DD4BF', is_predefined: true },
  { id: 'p-c11', tmdb_id: null, name: 'Space', color: '#818CF8', is_predefined: true },
  { id: 'p-c12', tmdb_id: null, name: 'Time Travel / Time Loop', color: '#A78BFA', is_predefined: true },
  { id: 'p-c13', tmdb_id: null, name: 'Travel', color: '#38BDF8', is_predefined: true },
];

export class GenresService {
  static async listGenres(userId: string) {
    // 1. Calculate genre movie counts using the effective single active genre per movie.
    let activeGenreNames: string[] = [];
    if (isPgConnected) {
      try {
        const { rows } = await pool.query(`
          SELECT
            um.id AS user_movie_id,
            um.assigned_genre,
            m.genres AS tmdb_genres,
            COALESCE(um.excluded_genres, ARRAY[]::TEXT[]) AS excluded_genres,
            (
              SELECT cg.name
              FROM user_movie_custom_genres umcg
              JOIN custom_genres cg ON cg.id = umcg.custom_genre_id
              WHERE umcg.user_movie_id = um.id
              LIMIT 1
            ) AS custom_genre_name
          FROM user_movies um
          JOIN movies m ON um.movie_id = m.id
          WHERE um.user_id = $1
        `, [userId]);

        for (const row of rows) {
          if (row.assigned_genre === '') {
            // Explicitly removed genre
            continue;
          }
          if (row.assigned_genre) {
            activeGenreNames.push(row.assigned_genre.toLowerCase());
            continue;
          }
          if (row.custom_genre_name) {
            activeGenreNames.push(row.custom_genre_name.toLowerCase());
            continue;
          }
          const tmdbGenres: { id?: number; name?: string }[] = Array.isArray(row.tmdb_genres) ? row.tmdb_genres : [];
          const excluded: string[] = row.excluded_genres || [];
          const active = tmdbGenres.find(g =>
            !excluded.includes(String(g.id)) &&
            !excluded.includes(g.name || '') &&
            !excluded.includes((g.name || '').toLowerCase())
          );
          if (active?.name) activeGenreNames.push(active.name.toLowerCase());
        }
      } catch {
        // Continue
      }
    } else {
      for (const um of Array.from(inMemoryDb.userMovies.values()).filter(u => u.user_id === userId)) {
        if ((um as any).assigned_genre === '') continue;
        if ((um as any).assigned_genre) {
          activeGenreNames.push(((um as any).assigned_genre as string).toLowerCase());
          continue;
        }
        const hasCustom = Array.from((inMemoryDb as any).userMovieCustomGenres?.values?.() || [])
          .find((umcg: any) => umcg.user_movie_id === um.id);
        if (hasCustom) {
          const cg = inMemoryDb.customGenres.get((hasCustom as any).custom_genre_id);
          if (cg?.name) activeGenreNames.push(cg.name.toLowerCase());
          continue;
        }
        const m = inMemoryDb.movies.get(um.movie_id);
        if (!m || !Array.isArray(m.genres)) continue;
        const excluded: string[] = (um as any).excluded_genres || [];
        const active = (m.genres as any[]).find(g =>
          !excluded.includes(String(g.id)) &&
          !excluded.includes(g.name || '') &&
          !excluded.includes((g.name || '').toLowerCase())
        );
        if (active?.name) activeGenreNames.push((active.name as string).toLowerCase());
      }
    }

    const predefined = PREDEFINED_GENRES.map(pg => {
      const count = activeGenreNames.filter(n => n === pg.name.toLowerCase()).length;
      return { ...pg, movie_count: count };
    });

    // 2. Fetch custom genres for user
    let custom: any[] = [];
    if (isPgConnected) {
      try {
        const sql = `
          SELECT cg.id, cg.name, cg.color, cg.description, cg.created_at,
                 FALSE AS is_predefined
          FROM custom_genres cg
          WHERE cg.user_id = $1
          ORDER BY cg.name ASC
        `;
        const { rows } = await pool.query(sql, [userId]);
        custom = rows.map(r => ({
          ...r,
          movie_count: activeGenreNames.filter(n => n === r.name.toLowerCase()).length,
        }));
      } catch {
        custom = [];
      }
    } else {
      custom = Array.from(inMemoryDb.customGenres.values())
        .filter(cg => cg.user_id === userId)
        .map(cg => {
          const count = activeGenreNames.filter(n => n === cg.name.toLowerCase()).length;
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
    const pgMatch = PREDEFINED_GENRES.find(
      pg => pg.id === genreId || String(pg.tmdb_id) === String(genreId) || pg.name.toLowerCase() === String(genreId).toLowerCase()
    );

    if (isPgConnected) {
      if (pgMatch) {
        // Predefined genre: replace any custom genre links and set assigned_genre to this predefined genre
        await pool.query('DELETE FROM user_movie_custom_genres WHERE user_movie_id = $1', [userMovieId]);
        await pool.query(`
          UPDATE user_movies
          SET assigned_genre = $1, excluded_genres = ARRAY[]::TEXT[]
          WHERE id = $2
        `, [pgMatch.name, userMovieId]);
        return { success: true };
      }

      // Check if matching any custom genre in database
      const { rows: cgRows } = await pool.query(
        'SELECT id, name FROM custom_genres WHERE id::text = $1 OR LOWER(name) = LOWER($1)',
        [String(genreId)]
      );

      if (cgRows.length > 0) {
        const cg = cgRows[0];
        await pool.query('DELETE FROM user_movie_custom_genres WHERE user_movie_id = $1', [userMovieId]);
        await pool.query(
          'INSERT INTO user_movie_custom_genres (user_movie_id, custom_genre_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userMovieId, cg.id]
        );
        await pool.query(
          'UPDATE user_movies SET assigned_genre = $1, excluded_genres = ARRAY[]::TEXT[] WHERE id = $2',
          [cg.name, userMovieId]
        );
        return { success: true };
      }

      // Otherwise set assigned_genre directly
      await pool.query(
        'UPDATE user_movies SET assigned_genre = $1, excluded_genres = ARRAY[]::TEXT[] WHERE id = $2',
        [genreId, userMovieId]
      );
      return { success: true };
    }

    const um = inMemoryDb.userMovies.get(userMovieId);
    if (um) {
      // Clear any custom genre link
      for (const [key, val] of inMemoryDb.userMovieCustomGenres.entries()) {
        if (val.user_movie_id === userMovieId) {
          inMemoryDb.userMovieCustomGenres.delete(key);
        }
      }

      if (pgMatch) {
        (um as any).assigned_genre = pgMatch.name;
        um.excluded_genres = [];
      } else {
        const cg = Array.from(inMemoryDb.customGenres.values())
          .find(c => c.id === genreId || c.name.toLowerCase() === String(genreId).toLowerCase());
        if (cg) {
          const key = `${userMovieId}-${cg.id}`;
          inMemoryDb.userMovieCustomGenres.set(key, { user_movie_id: userMovieId, custom_genre_id: cg.id });
          (um as any).assigned_genre = cg.name;
        } else {
          (um as any).assigned_genre = genreId;
        }
        um.excluded_genres = [];
      }
    }
    return { success: true };
  }

  static async detachGenreFromMovie(userMovieId: string, genreId?: string) {
    if (isPgConnected) {
      await pool.query('DELETE FROM user_movie_custom_genres WHERE user_movie_id = $1', [userMovieId]);
      await pool.query(`
        UPDATE user_movies
        SET assigned_genre = ''
        WHERE id = $1
      `, [userMovieId]);
      return { success: true };
    }

    const um = inMemoryDb.userMovies.get(userMovieId);
    if (um) {
      for (const [key, val] of inMemoryDb.userMovieCustomGenres.entries()) {
        if (val.user_movie_id === userMovieId) {
          inMemoryDb.userMovieCustomGenres.delete(key);
        }
      }
      (um as any).assigned_genre = '';
    }
    return { success: true };
  }
}
