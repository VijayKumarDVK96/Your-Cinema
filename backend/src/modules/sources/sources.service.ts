import { v4 as uuidv4 } from 'uuid';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';
import { Logger } from '../../utils/logger.js';

export interface AddSourceInput {
  userMovieId: string;
  sourceType: 'google_drive' | 'youtube' | 'ott' | 'custom_url';
  providerName: string;
  providerIcon?: string;
  externalUrl?: string;
  externalFileId?: string;
  fileName?: string;
  quality?: string;
}

export class SourcesService {
  static async listSources(userMovieId: string) {
    if (isPgConnected) {
      const { rows } = await pool.query(
        'SELECT * FROM movie_sources WHERE user_movie_id = $1 ORDER BY created_at ASC',
        [userMovieId]
      );
      return rows;
    }

    return Array.from(inMemoryDb.movieSources.values())
      .filter(s => s.user_movie_id === userMovieId);
  }

  static async addSource(userId: string, input: AddSourceInput) {
    const sourceId = uuidv4();
    const icon = input.providerIcon || input.sourceType;

    if (isPgConnected) {
      const { rows } = await pool.query(`
        INSERT INTO movie_sources (
          id, user_movie_id, source_type, provider_name, provider_icon,
          external_url, external_file_id, file_name, quality
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        sourceId, input.userMovieId, input.sourceType, input.providerName,
        icon, input.externalUrl || null, input.externalFileId || null,
        input.fileName || null, input.quality || '1080p'
      ]);
      return rows[0];
    }

    const newSource = {
      id: sourceId,
      user_movie_id: input.userMovieId,
      source_type: input.sourceType,
      provider_name: input.providerName,
      provider_icon: icon,
      external_url: input.externalUrl || null,
      external_file_id: input.externalFileId || null,
      file_name: input.fileName || null,
      quality: input.quality || '1080p',
      created_at: new Date().toISOString(),
    };
    inMemoryDb.movieSources.set(sourceId, newSource);
    return newSource;
  }

  static async deleteSource(userId: string, sourceId: string) {
    if (isPgConnected) {
      const result = await pool.query('DELETE FROM movie_sources WHERE id = $1', [sourceId]);
      if (result.rowCount === 0) throw new NotFoundError('Source not found');
      return { success: true };
    }

    const source = inMemoryDb.movieSources.get(sourceId);
    if (!source) throw new NotFoundError('Source not found');
    inMemoryDb.movieSources.delete(sourceId);
    return { success: true };
  }

  static async updatePlaybackProgress(userId: string, userMovieId: string, positionSec: number, completed: boolean = false) {
    if (isPgConnected) {
      const status = completed ? 'watched' : 'watching';
      await pool.query(`
        UPDATE user_movies
        SET playback_position_sec = $1,
            watch_status = CASE WHEN $2 = true THEN 'watched' ELSE 'watching' END,
            last_watched_at = NOW(),
            updated_at = NOW()
        WHERE id = $3 AND user_id = $4
      `, [positionSec, completed, userMovieId, userId]);
      return { success: true, positionSec, status };
    }

    const um = inMemoryDb.userMovies.get(userMovieId);
    if (um && um.user_id === userId) {
      um.playback_position_sec = positionSec;
      um.watch_status = completed ? 'watched' : 'watching';
      um.last_watched_at = new Date().toISOString();
      inMemoryDb.userMovies.set(userMovieId, um);
    }
    return { success: true, positionSec };
  }
}
