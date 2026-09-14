import { v4 as uuidv4 } from 'uuid';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export class TagsService {
  static async listUserTags(userId: string) {
    if (isPgConnected) {
      const sql = `
        SELECT t.id, t.name, t.color, COUNT(umt.user_movie_id)::INT AS movie_count
        FROM tags t
        LEFT JOIN user_movie_tags umt ON t.id = umt.tag_id
        WHERE t.user_id = $1
        GROUP BY t.id, t.name, t.color
        ORDER BY t.name ASC
      `;
      const { rows } = await pool.query(sql, [userId]);
      return rows;
    }

    return Array.from(inMemoryDb.tags.values())
      .filter(t => t.user_id === userId)
      .map(t => {
        const count = Array.from(inMemoryDb.userMovieTags.values())
          .filter(umt => umt.tag_id === t.id).length;
        return { ...t, movie_count: count };
      });
  }

  static async createTag(userId: string, data: { name: string; color?: string }) {
    const existing = isPgConnected
      ? (await pool.query('SELECT id FROM tags WHERE user_id = $1 AND LOWER(name) = $2', [userId, data.name.trim().toLowerCase()])).rows[0]
      : Array.from(inMemoryDb.tags.values()).find(t => t.user_id === userId && t.name.toLowerCase() === data.name.trim().toLowerCase());

    if (existing) {
      throw new BadRequestError('A tag with this name already exists.');
    }

    const tagId = uuidv4();
    const tagColor = data.color || '#E5A93C';

    if (isPgConnected) {
      const { rows } = await pool.query(
        'INSERT INTO tags (id, user_id, name, color) VALUES ($1, $2, $3, $4) RETURNING *',
        [tagId, userId, data.name.trim(), tagColor]
      );
      return rows[0];
    }

    const newTag = { id: tagId, user_id: userId, name: data.name.trim(), color: tagColor };
    inMemoryDb.tags.set(tagId, newTag);
    return newTag;
  }

  static async deleteTag(userId: string, tagId: string) {
    if (isPgConnected) {
      const result = await pool.query('DELETE FROM tags WHERE id = $1 AND user_id = $2', [tagId, userId]);
      if (result.rowCount === 0) throw new NotFoundError('Tag not found');
      return { success: true };
    }

    const tag = inMemoryDb.tags.get(tagId);
    if (!tag || tag.user_id !== userId) throw new NotFoundError('Tag not found');
    inMemoryDb.tags.delete(tagId);
    return { success: true };
  }

  static async attachTagToMovie(userMovieId: string, tagId: string) {
    if (isPgConnected) {
      await pool.query(
        'INSERT INTO user_movie_tags (user_movie_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userMovieId, tagId]
      );
      return { success: true };
    }

    const key = `${userMovieId}-${tagId}`;
    inMemoryDb.userMovieTags.set(key, { user_movie_id: userMovieId, tag_id: tagId });
    return { success: true };
  }

  static async detachTagFromMovie(userMovieId: string, tagId: string) {
    if (isPgConnected) {
      await pool.query('DELETE FROM user_movie_tags WHERE user_movie_id = $1 AND tag_id = $2', [userMovieId, tagId]);
      return { success: true };
    }

    const key = `${userMovieId}-${tagId}`;
    inMemoryDb.userMovieTags.delete(key);
    return { success: true };
  }
}
