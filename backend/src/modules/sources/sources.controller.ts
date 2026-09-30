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
        '-probesize', '32M',
        '-analyzeduration', '32M',
        '-show_entries', 'stream=index,codec_type,codec_name:stream_tags=language,title',
        '-of', 'json',
        directUrl,
      ]);

      let stdout = '';
      ffprobeProc.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      const timeout = setTimeout(() => {
        try { ffprobeProc.kill(); } catch {}
      }, 25000);

      ffprobeProc.on('close', (code) => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(stdout || '{}');
          const streams: any[] = parsed.streams || [];

          // Use audio-relative index (0, 1, 2...) not global stream index
          let audioRelIdx = 0;
          const audioTracks = streams
            .filter((s) => s.codec_type === 'audio')
            .map((s) => {
              const lang = s.tags?.language || s.tags?.LANGUAGE || '';
              const title = s.tags?.title || s.tags?.TITLE || '';
              const label = title || (lang ? `${lang.toUpperCase()} (${s.codec_name || 'audio'})` : `Audio Track ${audioRelIdx + 1}`);
              const track = {
                id: `audio-${audioRelIdx}`,
                index: audioRelIdx,
                globalIndex: s.index,
                label,
                language: lang || 'und',
                codec: s.codec_name,
                selected: audioRelIdx === 0,
              };
              audioRelIdx++;
              return track;
            });

          let subRelIdx = 0;
          const subtitleTracks = streams
            .filter((s) => s.codec_type === 'subtitle')
            .map((s) => {
              const lang = s.tags?.language || s.tags?.LANGUAGE || '';
              const title = s.tags?.title || s.tags?.TITLE || '';
              const label = title || (lang ? `${lang.toUpperCase()} Subtitles` : `Subtitle Track ${subRelIdx + 1}`);
              const track = {
                id: `sub-${subRelIdx}`,
                index: subRelIdx,
                streamIndex: s.index,
                label,
                language: lang || 'en',
                src: `/api/sources/drive/${fileId}/subtitles/${subRelIdx}`,
                default: subRelIdx === 0,
              };
              subRelIdx++;
              return track;
            });

          if (audioTracks.length > 0 || subtitleTracks.length > 0) {
            mediaInfoCache.set(fileId, { audioTracks, subtitleTracks, timestamp: Date.now() });
          }
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

      const audioTrackParam = req.query.audioTrack || req.query.audioIndex;
      const audioIndex = audioTrackParam !== undefined && audioTrackParam !== '' ? parseInt(String(audioTrackParam), 10) : null;
      const seekSec = Math.max(0, parseInt(String(req.query.t || req.query.time || req.query.start || '0'), 10) || 0);
      const quality = String(req.query.quality || req.query.res || '').toLowerCase();

      // Always transmux through ffmpeg for browser-compatible MP4 output
      // This handles MKV, AVI, and other formats that browsers can't play natively
      const { spawn } = await import('child_process');
      const audioMap = (audioIndex !== null && !isNaN(audioIndex) && audioIndex > 0)
        ? `0:a:${audioIndex}`
        : '0:a:0';

      const is360p = quality === '360p' || quality === 'lowest';
      const is480p = quality === '480p' || quality === 'low' || quality === 'sd';
      const is720p = quality === '720p' || quality === 'hd';

      let videoCodecArgs: string[];
      let audioBitrate = '192k';

      if (is360p) {
        videoCodecArgs = [
          '-vf', 'scale=-2:360',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-b:v', '450k',
          '-maxrate', '600k',
          '-bufsize', '1000k',
        ];
        audioBitrate = '96k';
      } else if (is480p) {
        videoCodecArgs = [
          '-vf', 'scale=-2:480',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-b:v', '750k',
          '-maxrate', '1000k',
          '-bufsize', '1500k',
        ];
        audioBitrate = '128k';
      } else if (is720p) {
        videoCodecArgs = [
          '-vf', 'scale=-2:720',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-tune', 'zerolatency',
          '-b:v', '1800k',
          '-maxrate', '2200k',
          '-bufsize', '3000k',
        ];
        audioBitrate = '160k';
      } else {
        videoCodecArgs = ['-c:v', 'copy'];
      }

      const ffmpegArgs = [
        '-v', 'error',
        '-hide_banner',
        // Input seeking BEFORE -i for fast keyframe-level seeking (near-instant)
        ...(seekSec > 0 ? ['-ss', String(seekSec)] : []),
        '-i', directUrl,
        '-map', '0:v:0',
        '-map', audioMap,
        ...videoCodecArgs,
        '-c:a', 'aac',
        '-b:a', audioBitrate,
        '-ac', '2',
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
        '-f', 'mp4',
        'pipe:1',
      ];

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'none');
      res.setHeader('Cache-Control', 'no-cache');

      const ffmpegProc = spawn('ffmpeg', ffmpegArgs);
      let hasData = false;
      let hasEnded = false;

      req.on('close', () => {
        try { ffmpegProc.kill('SIGKILL'); } catch {}
      });

      ffmpegProc.stderr.on('data', (data) => {
        const errStr = data.toString();
        if (errStr.includes('403') || errStr.includes('Server returned') || errStr.includes('HTTP error')) {
          // Drive quota/access error - send error response
          if (!hasData && !hasEnded && !res.headersSent) {
            hasEnded = true;
            try { ffmpegProc.kill(); } catch {}
            res.status(503).json({
              error: 'Google Drive access error. Try Drive Player mode.',
              previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
            });
          }
        }
      });

      ffmpegProc.stdout.on('data', () => {
        hasData = true;
      });

      ffmpegProc.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });

      ffmpegProc.on('close', (code) => {
        hasEnded = true;
        if (!hasData && !res.headersSent) {
          res.status(500).json({ error: 'Transcoding failed. The file may be unavailable.' });
        }
      });

      ffmpegProc.stdout.pipe(res);
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
