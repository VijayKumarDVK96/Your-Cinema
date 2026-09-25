import { Request, Response, NextFunction } from 'express';
import { SourcesService, extractDriveFileId } from './sources.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';
import { BadRequestError } from '../../utils/errors.js';

const mediaInfoCache = new Map<string, { audioTracks: any[]; subtitleTracks: any[]; timestamp: number }>();
const subtitleCache = new Map<string, string>();

export class SourcesController {
  static async getDriveMediaInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.fileId || (req.query.fileId as string) || '';
      const fileId = extractDriveFileId(decodeURIComponent(rawParam));
      if (!fileId) throw new BadRequestError('Drive file ID is required');

      const cached = mediaInfoCache.get(fileId);
      if (cached && Date.now() - cached.timestamp < 3600000) {
        return sendSuccess(res, { audioTracks: cached.audioTracks, subtitleTracks: cached.subtitleTracks });
      }

      const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
      const { spawn } = await import('child_process');

      const ffprobeProc = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'stream=index,codec_type,codec_name:stream_tags=language,title:format_tags=title',
        '-of', 'json',
        directUrl,
      ]);

      let stdout = '';
      ffprobeProc.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      const timeout = setTimeout(() => {
        try { ffprobeProc.kill(); } catch {}
      }, 15000);

      ffprobeProc.on('close', (code) => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(stdout || '{}');
          const streams: any[] = parsed.streams || [];

          const audioTracks = streams
            .filter((s) => s.codec_type === 'audio')
            .map((s, idx) => {
              const lang = s.tags?.language || s.tags?.LANGUAGE || '';
              const title = s.tags?.title || s.tags?.TITLE || '';
              const label = title || (lang ? `${lang.toUpperCase()} (${s.codec_name || 'audio'})` : `Audio Track ${idx + 1}`);
              return {
                id: `audio-${s.index}`,
                index: s.index,
                label,
                language: lang || 'und',
                codec: s.codec_name,
                selected: idx === 0,
              };
            });

          const subtitleTracks = streams
            .filter((s) => s.codec_type === 'subtitle')
            .map((s, idx) => {
              const lang = s.tags?.language || s.tags?.LANGUAGE || '';
              const title = s.tags?.title || s.tags?.TITLE || '';
              const label = title || (lang ? `${lang.toUpperCase()} Subtitles` : `Subtitle Track ${idx + 1}`);
              return {
                id: `sub-${s.index}`,
                index: idx,
                streamIndex: s.index,
                label,
                language: lang || 'en',
                src: `/api/sources/drive/${fileId}/subtitles/${idx}`,
                default: idx === 0,
              };
            });

          mediaInfoCache.set(fileId, { audioTracks, subtitleTracks, timestamp: Date.now() });
          return sendSuccess(res, { audioTracks, subtitleTracks });
        } catch {
          return sendSuccess(res, { audioTracks: [], subtitleTracks: [] });
        }
      });

      ffprobeProc.on('error', () => {
        clearTimeout(timeout);
        return sendSuccess(res, { audioTracks: [], subtitleTracks: [] });
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDriveSubtitleTrack(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.fileId || '';
      const fileId = extractDriveFileId(decodeURIComponent(rawParam));
      const trackIndex = parseInt(req.params.trackIndex || '0', 10);
      if (!fileId) throw new BadRequestError('Drive file ID is required');

      const cacheKey = `${fileId}_${trackIndex}`;
      const cached = subtitleCache.get(cacheKey);
      if (cached) {
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(cached);
      }

      const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
      const { spawn } = await import('child_process');

      const ffmpegProc = spawn('ffmpeg', [
        '-v', 'error',
        '-i', directUrl,
        '-map', `0:s:${trackIndex}`,
        '-f', 'webvtt',
        '-',
      ]);

      let output = '';
      ffmpegProc.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });

      const timeout = setTimeout(() => {
        try { ffmpegProc.kill(); } catch {}
      }, 30000);

      ffmpegProc.on('close', (code) => {
        clearTimeout(timeout);
        if (output && output.startsWith('WEBVTT')) {
          subtitleCache.set(cacheKey, output);
          res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(output);
        }
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        return res.send('WEBVTT\n\n');
      });

      ffmpegProc.on('error', () => {
        clearTimeout(timeout);
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        return res.send('WEBVTT\n\n');
      });
    } catch (err) {
      next(err);
    }
  }

  static async streamDrive(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.fileId || req.params[0] || (req.query.fileId as string) || req.url || '';
      const fileId = extractDriveFileId(decodeURIComponent(rawParam));
      if (!fileId) throw new BadRequestError('Drive file ID is required');

      const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

      if (req.query.redirect === 'true') {
        return res.redirect(302, directUrl);
      }

      const headers: Record<string, string> = {};
      if (req.headers.range) {
        headers['Range'] = req.headers.range;
      }

      const controller = new AbortController();
      req.on('close', () => controller.abort());

      const driveRes = await fetch(directUrl, {
        headers,
        signal: controller.signal,
      });

      res.status(driveRes.status);

      const forwardHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'last-modified',
        'etag',
      ];

      forwardHeaders.forEach((h) => {
        const val = driveRes.headers.get(h);
        if (val) {
          if (h === 'content-type' && (val.includes('octet-stream') || val.includes('text/plain'))) {
            res.setHeader('Content-Type', 'video/x-matroska');
          } else {
            res.setHeader(h, val);
          }
        }
      });

      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'video/x-matroska');
      }

      if (!driveRes.headers.get('accept-ranges')) {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      if (!driveRes.body) {
        return res.end();
      }

      const { Readable } = await import('stream');
      const nodeReadable = Readable.fromWeb(driveRes.body as any);
      nodeReadable.on('error', () => {});
      res.on('error', () => {});
      nodeReadable.pipe(res);
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ABORT_ERR' || req.destroyed) {
        return;
      }
      next(err);
    }
  }

  static async detect(req: Request, res: Response, next: NextFunction) {
    try {
      const { userMovieId } = req.params;
      const userId = req.user!.id;
      const movie = await MoviesService.getMovieById(userId, userMovieId);
      return sendSuccess(res, movie.sources || []);
    } catch (err) {
      next(err);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const sources = await SourcesService.listSources(req.params.userMovieId);
      return sendSuccess(res, sources);
    } catch (err) {
      next(err);
    }
  }

  static async getProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const progress = await SourcesService.getPlaybackProgress(req.user!.id, req.params.userMovieId);
      return sendSuccess(res, progress);
    } catch (err) {
      next(err);
    }
  }

  static async add(req: Request, res: Response, next: NextFunction) {
    try {
      const source = await SourcesService.addSource(req.user!.id, req.body);
      return sendCreated(res, source);
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SourcesService.deleteSource(req.user!.id, req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async updateProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { positionSec, completed, sourceId, sourceType } = req.body;
      const result = await SourcesService.updatePlaybackProgress(
        req.user!.id,
        req.params.userMovieId,
        positionSec,
        completed,
        sourceId,
        sourceType
      );
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  static async bulkOttPreview(req: Request, res: Response, next: NextFunction) {
    try {
      const { entries } = req.body;
      if (!Array.isArray(entries)) {
        throw new BadRequestError('Entries array is required');
      }
      const data = await SourcesService.bulkOttUpdatePreview(req.user!.id, entries);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  static async bulkOttApply(req: Request, res: Response, next: NextFunction) {
    try {
      const { updates } = req.body;
      if (!Array.isArray(updates)) {
        throw new BadRequestError('Updates array is required');
      }
      const data = await SourcesService.bulkOttUpdateApply(req.user!.id, updates);
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
}
