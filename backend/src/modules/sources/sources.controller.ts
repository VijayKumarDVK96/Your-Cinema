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
        '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '4',
        '-rw_timeout', '15000000',
        '-probesize', '8M',
        '-analyzeduration', '8M',
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
        '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '4',
        '-rw_timeout', '20000000',
        '-probesize', '8M',
        '-analyzeduration', '8M',
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
      const quality = String(req.query.quality || req.query.res || 'auto').toLowerCase();

      const { spawn } = await import('child_process');
      const audioMap = (audioIndex !== null && !isNaN(audioIndex) && audioIndex > 0)
        ? `0:a:${audioIndex}`
        : '0:a:0';

      const isDirect = quality === 'direct' || quality === 'original' || quality === 'passthrough';
      const is360p = quality === '360p' || quality === 'lowest';
      const is480p = quality === '480p' || quality === 'low' || quality === 'sd';
      const is720p = quality === '720p' || quality === 'hd';
      const is1080p = quality === '1080p' || quality === 'fhd';

      let videoCodecArgs: string[];
      let audioBitrate = '128k';

      if (isDirect) {
        // Direct stream pass-through for unmetered high-speed broadband
        videoCodecArgs = ['-c:v', 'copy'];
        audioBitrate = '192k';
      } else if (is360p) {
        // Ultra low bandwidth mode (3G / extreme throttled internet)
        videoCodecArgs = [
          '-vf', 'scale=-2:360',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-pix_fmt', 'yuv420p',
          '-b:v', '360k',
          '-maxrate', '480k',
          '-bufsize', '750k',
          '-g', '48',
          '-keyint_min', '24',
        ];
        audioBitrate = '64k';
      } else if (is480p) {
        // Weak internet / data saver mode (1-2 Mbps connections)
        videoCodecArgs = [
          '-vf', 'scale=-2:480',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-pix_fmt', 'yuv420p',
          '-b:v', '650k',
          '-maxrate', '850k',
          '-bufsize', '1200k',
          '-g', '48',
          '-keyint_min', '24',
        ];
        audioBitrate = '96k';
      } else if (is720p) {
        // 720p HD balanced mode
        videoCodecArgs = [
          '-vf', 'scale=-2:720',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-pix_fmt', 'yuv420p',
          '-b:v', '1400k',
          '-maxrate', '1800k',
          '-bufsize', '2500k',
          '-g', '48',
          '-keyint_min', '24',
        ];
        audioBitrate = '128k';
      } else if (is1080p) {
        // 1080p Full HD mode
        videoCodecArgs = [
          '-vf', 'scale=-2:1080',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-pix_fmt', 'yuv420p',
          '-b:v', '3000k',
          '-maxrate', '3800k',
          '-bufsize', '5000k',
          '-g', '48',
          '-keyint_min', '24',
        ];
        audioBitrate = '160k';
      } else {
        // 'auto' Default: Smart Adaptive Streaming for reliable playback on ANY connection
        // Capped at 720p to guarantee fast keyframe loading and eliminate endless buffering on weak networks
        videoCodecArgs = [
          '-vf', 'scale=-2:\'min(720,ih)\'',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-tune', 'zerolatency',
          '-pix_fmt', 'yuv420p',
          '-b:v', '1300k',
          '-maxrate', '1700k',
          '-bufsize', '2400k',
          '-g', '48',
          '-keyint_min', '24',
        ];
        audioBitrate = '128k';
      }

      const ffmpegArgs = [
        '-v', 'error',
        '-hide_banner',
        // High-resilience network args to survive weak / unstable connections
        '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '4',
        '-rw_timeout', '25000000',
        '-probesize', '8M',
        '-analyzeduration', '8M',
        // Fast keyframe-level input seek before -i
        ...(seekSec > 0 ? ['-ss', String(seekSec)] : []),
        '-i', directUrl,
        '-map', '0:v:0',
        '-map', `${audioMap}?`,
        ...videoCodecArgs,
        '-c:a', 'aac',
        '-b:a', audioBitrate,
        '-ac', '2',
        ...(seekSec > 0 ? ['-avoid_negative_ts', 'make_zero'] : []),
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
        '-f', 'mp4',
        'pipe:1',
      ];

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'none');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Content-Type-Options', 'nosniff');

      const ffmpegProc = spawn('ffmpeg', ffmpegArgs);
      let hasData = false;
      let isCleanedUp = false;

      const cleanupProcess = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        try {
          if (!ffmpegProc.killed) {
            ffmpegProc.kill();
            if (process.platform === 'win32' && ffmpegProc.pid) {
              import('child_process').then(({ exec }) => {
                exec(`taskkill /pid ${ffmpegProc.pid} /T /F`, () => {});
              }).catch(() => {});
            }
          }
        } catch {}
      };

      req.on('close', cleanupProcess);
      res.on('finish', cleanupProcess);
      res.on('error', cleanupProcess);

      ffmpegProc.stderr.on('data', (data) => {
        const errStr = data.toString();
        if (errStr.includes('403') || errStr.includes('Server returned 403') || errStr.includes('HTTP error 403')) {
          if (!hasData && !res.headersSent) {
            cleanupProcess();
            res.status(503).json({
              error: 'Google Drive rate limit or access error. Please verify the file sharing settings.',
            });
          }
        }
      });

      ffmpegProc.stdout.on('data', () => {
        hasData = true;
      });

      ffmpegProc.on('error', (err) => {
        cleanupProcess();
        if (!res.headersSent) {
          res.status(500).json({ error: 'FFmpeg transcode error', details: err.message });
        }
      });

      ffmpegProc.on('close', (code) => {
        if (!hasData && !res.headersSent) {
          res.status(500).json({ error: 'Playback stream failed to start. The file may be temporarily unavailable.' });
        }
        cleanupProcess();
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
