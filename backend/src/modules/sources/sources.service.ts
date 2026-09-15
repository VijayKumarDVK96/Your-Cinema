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

export function extractDriveFileId(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  const fileDMatch = trimmed.match(/\/(?:file\/d|folders|d)\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];
  if (!trimmed.includes('/') && !trimmed.includes('?') && !trimmed.includes('&')) {
    return trimmed;
  }
  return trimmed;
}

export function formatPlaybackTime(sec: number): string {
  if (!sec || sec <= 0) return '0s';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  }
  return `${m}m ${s.toString().padStart(2, '0')}s`;
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

    if (input.sourceType === 'google_drive') {
      const raw = input.externalFileId || input.externalUrl || '';
      const cleanId = extractDriveFileId(raw);
      input.externalFileId = cleanId;
      if (!input.externalUrl && cleanId) {
        input.externalUrl = `https://drive.google.com/file/d/${cleanId}/view`;
      }
    }

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

  static async getPlaybackProgress(userId: string, userMovieId: string) {
    if (isPgConnected) {
      try {
        const { rows } = await pool.query(
          'SELECT * FROM movie_playback_progress WHERE user_id = $1 AND user_movie_id = $2',
          [userId, userMovieId]
        );
        if (rows.length > 0) return rows[0];
      } catch (err: any) {
        Logger.warn(`Failed to fetch movie_playback_progress: ${err.message}`);
      }
    }

    return inMemoryDb.moviePlaybackProgress.get(userMovieId) || null;
  }

  static async updatePlaybackProgress(
    userId: string,
    userMovieId: string,
    positionSec: number,
    completed: boolean = false,
    sourceId?: string | null,
    sourceType?: string | null
  ) {
    const status = completed ? 'watched' : 'watching';
    const formattedTime = formatPlaybackTime(positionSec);

    if (isPgConnected) {
      // 1. Update user_movies table
      await pool.query(`
        UPDATE user_movies
        SET playback_position_sec = $1,
            watch_status = CASE WHEN $2 = true THEN 'watched' ELSE 'watching' END,
            last_watched_at = NOW(),
            updated_at = NOW()
        WHERE id = $3 AND user_id = $4
      `, [positionSec, completed, userMovieId, userId]);

      // 2. Upsert into dedicated movie_playback_progress table (with ON DELETE CASCADE reference)
      let progressRecord = null;
      try {
        const { rows } = await pool.query(`
          INSERT INTO movie_playback_progress (
            id, user_id, user_movie_id, source_id, source_type,
            last_played_position_sec, last_played_time_formatted, completed,
            last_played_at, updated_at
          ) VALUES (
            uuid_generate_v4(), $1, $2, $3, $4,
            $5, $6, $7,
            NOW(), NOW()
          )
          ON CONFLICT (user_id, user_movie_id) DO UPDATE SET
            source_id = COALESCE(EXCLUDED.source_id, movie_playback_progress.source_id),
            source_type = COALESCE(EXCLUDED.source_type, movie_playback_progress.source_type),
            last_played_position_sec = EXCLUDED.last_played_position_sec,
            last_played_time_formatted = EXCLUDED.last_played_time_formatted,
            completed = EXCLUDED.completed,
            last_played_at = NOW(),
            updated_at = NOW()
          RETURNING *
        `, [
          userId,
          userMovieId,
          sourceId || null,
          sourceType || null,
          positionSec,
          formattedTime,
          completed,
        ]);
        progressRecord = rows[0];
      } catch (err: any) {
        Logger.warn(`Failed to upsert movie_playback_progress: ${err.message}`);
      }

      return {
        success: true,
        positionSec,
        formattedTime,
        status,
        progress: progressRecord,
      };
    }

    // In-memory fallback
    const um = inMemoryDb.userMovies.get(userMovieId);
    if (um && um.user_id === userId) {
      um.playback_position_sec = positionSec;
      um.watch_status = status;
      um.last_watched_at = new Date().toISOString();
      inMemoryDb.userMovies.set(userMovieId, um);
    }

    const existingProg = inMemoryDb.moviePlaybackProgress.get(userMovieId) || {
      id: `prog-${Date.now()}`,
      user_id: userId,
      user_movie_id: userMovieId,
      created_at: new Date().toISOString(),
    };

    const updatedProg = {
      ...existingProg,
      source_id: sourceId || existingProg.source_id || null,
      source_type: sourceType || existingProg.source_type || null,
      last_played_position_sec: positionSec,
      last_played_time_formatted: formattedTime,
      completed,
      last_played_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryDb.moviePlaybackProgress.set(userMovieId, updatedProg);

    return {
      success: true,
      positionSec,
      formattedTime,
      status,
      progress: updatedProg,
    };
  }
}
