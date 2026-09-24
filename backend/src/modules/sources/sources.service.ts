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

export function detectProviderFromUrl(url: string, fallbackName: string): string {
  const u = (url || '').toLowerCase();
  if (u.includes('primevideo.com') || u.includes('amazon.com')) return 'Prime Video';
  if (u.includes('netflix.com')) return 'Netflix';
  if (u.includes('hotstar.com') || u.includes('jiohotstar.com') || u.includes('disneyplus.com')) return 'JioHotstar';
  if (u.includes('sunnxt.com')) return 'Sun NXT';
  if (u.includes('zee5.com')) return 'Zee5';
  if (u.includes('jiocinema.com')) return 'JioCinema';
  if (u.includes('sonyliv.com')) return 'Sony LIV';
  if (u.includes('lionsgateplay.com') || u.includes('lionsgate.com')) return 'Lionsgate Play';
  if (u.includes('aha.video')) return 'Aha';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  if (u.includes('tv.apple.com') || u.includes('apple.com')) return 'Apple TV+';
  return fallbackName;
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
      // Verify ownership: source must belong to a user_movie owned by this user
      const result = await pool.query(
        `DELETE FROM movie_sources
         WHERE id = $1
           AND user_movie_id IN (SELECT id FROM user_movies WHERE user_id = $2)
         RETURNING id`,
        [sourceId, userId]
      );
      if ((result.rowCount ?? 0) === 0) throw new NotFoundError('Source not found or access denied');
      return { success: true, deletedId: sourceId };
    }

    const source = inMemoryDb.movieSources.get(sourceId);
    if (!source) throw new NotFoundError('Source not found');
    inMemoryDb.movieSources.delete(sourceId);
    return { success: true, deletedId: sourceId };
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

  static async bulkOttUpdatePreview(userId: string, entries: { title: string; providerName: string; directUrl: string }[]) {
    // Fetch all user movies to perform title matching
    let userMoviesList: any[] = [];
    if (isPgConnected) {
      const { rows } = await pool.query(`
        SELECT um.id AS user_movie_id, m.title, m.original_title, m.poster_path, m.release_date AS release_year,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', ms.id,
                     'provider_name', ms.provider_name,
                     'external_url', ms.external_url,
                     'source_type', ms.source_type
                   )
                 ) FILTER (WHERE ms.id IS NOT NULL), '[]'
               ) AS sources
        FROM user_movies um
        JOIN movies m ON um.movie_id = m.id
        LEFT JOIN movie_sources ms ON ms.user_movie_id = um.id
        WHERE um.user_id = $1
        GROUP BY um.id, m.id
      `, [userId]);
      userMoviesList = rows;
    } else {
      userMoviesList = Array.from(inMemoryDb.userMovies.values())
        .filter(um => um.user_id === userId)
        .map(um => {
          const m = inMemoryDb.movies.get(um.movie_id) || {};
          const sources = Array.from(inMemoryDb.movieSources.values())
            .filter(s => s.user_movie_id === um.id);
          return {
            user_movie_id: um.id,
            title: m.title || um.title || 'Untitled',
            original_title: m.original_title || '',
            poster_path: m.poster_path || um.poster_path,
            release_year: m.release_year,
            sources,
          };
        });
    }

    const results = entries.map(entry => {
      const cleanInput = entry.title.trim().toLowerCase().replace(/^the\s+/, '');
      const realProviderName = detectProviderFromUrl(entry.directUrl, entry.providerName);

      const exactMatches = userMoviesList.filter(m => {
        const t1 = (m.title || '').trim().toLowerCase();
        const t2 = (m.original_title || '').trim().toLowerCase();
        const t1NoThe = t1.replace(/^the\s+/, '');
        return t1 === entry.title.trim().toLowerCase() ||
               t2 === entry.title.trim().toLowerCase() ||
               t1NoThe === cleanInput;
      });

      const partialMatches = userMoviesList.filter(m => {
        const t1 = (m.title || '').trim().toLowerCase();
        return t1.includes(cleanInput) || cleanInput.includes(t1);
      });

      const matches = exactMatches.length > 0 ? exactMatches : partialMatches;

      if (matches.length === 1) {
        return {
          inputTitle: entry.title,
          providerName: realProviderName,
          directUrl: entry.directUrl,
          status: 'matched' as const,
          selectedMovie: matches[0],
          candidates: matches,
        };
      } else if (matches.length > 1) {
        return {
          inputTitle: entry.title,
          providerName: realProviderName,
          directUrl: entry.directUrl,
          status: 'ambiguous' as const,
          selectedMovie: matches[0], // preselect closest
          candidates: matches,
        };
      } else {
        return {
          inputTitle: entry.title,
          providerName: realProviderName,
          directUrl: entry.directUrl,
          status: 'not_found' as const,
          selectedMovie: null,
          candidates: [],
        };
      }
    });

    return results;
  }

  static async bulkOttUpdateApply(
    userId: string,
    updates: { userMovieId: string; providerName: string; directUrl: string; replaceExisting?: boolean }[]
  ) {
    let appliedCount = 0;

    for (const item of updates) {
      if (!item.userMovieId || !item.directUrl) continue;
      const replaceExisting = item.replaceExisting !== false; // default true
      const realProviderName = detectProviderFromUrl(item.directUrl, item.providerName);

      if (isPgConnected) {
        // Verify ownership
        const check = await pool.query('SELECT id FROM user_movies WHERE id = $1 AND user_id = $2', [item.userMovieId, userId]);
        if (check.rows.length === 0) continue;

        if (replaceExisting) {
          // Delete existing sources with same provider name for this movie
          await pool.query(
            `DELETE FROM movie_sources WHERE user_movie_id = $1 AND (LOWER(provider_name) = LOWER($2) OR LOWER(provider_name) = LOWER($3))`,
            [item.userMovieId, item.providerName, realProviderName]
          );
        }

        const sourceId = uuidv4();
        await pool.query(`
          INSERT INTO movie_sources (
            id, user_movie_id, source_type, provider_name, provider_icon, external_url, quality
          ) VALUES ($1, $2, 'ott', $3, $4, $5, '4K UHD')
        `, [sourceId, item.userMovieId, realProviderName, realProviderName.toLowerCase(), item.directUrl]);
        appliedCount++;
      } else {
        const um = inMemoryDb.userMovies.get(item.userMovieId);
        if (!um || um.user_id !== userId) continue;

        if (replaceExisting) {
          for (const [sId, s] of inMemoryDb.movieSources.entries()) {
            const pLower = (s.provider_name || '').toLowerCase();
            if (s.user_movie_id === item.userMovieId && (pLower === item.providerName.toLowerCase() || pLower === realProviderName.toLowerCase())) {
              inMemoryDb.movieSources.delete(sId);
            }
          }
        }

        const newSource = {
          id: uuidv4(),
          user_movie_id: item.userMovieId,
          source_type: 'ott' as const,
          provider_name: realProviderName,
          provider_icon: realProviderName.toLowerCase(),
          external_url: item.directUrl,
          external_file_id: null,
          file_name: null,
          quality: '4K UHD',
          created_at: new Date().toISOString(),
        };
        inMemoryDb.movieSources.set(newSource.id, newSource);
        appliedCount++;
      }
    }

    return { success: true, updatedCount: appliedCount };
  }
}

