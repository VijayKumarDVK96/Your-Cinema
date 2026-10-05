import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { SourcesService, extractDriveFileId } from './sources.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';
import { BadRequestError } from '../../utils/errors.js';

const mediaInfoCache = new Map<string, { audioTracks: any[]; subtitleTracks: any[]; timestamp: number }>();
const subtitleCache = new Map<string, string>();

export interface DriveDirectInfo {
  directUrl: string;
  cookies: string;
  totalSize: number;
  contentType: string;
  expiresAt: number;
}

const driveDirectCache = new Map<string, DriveDirectInfo>();

export async function resolveDriveDirect(fileId: string): Promise<DriveDirectInfo> {
  const cached = driveDirectCache.get(fileId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  const url1 = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res1 = await fetch(url1, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
  });
  const cookies = res1.headers.get('set-cookie') || '';
  const html1 = await res1.text();

  let confirmToken = 't';
  const confirmMatch = html1.match(/name="confirm"\s+value="([^"]+)"/) || html1.match(/confirm=([0-9a-zA-Z_-]+)/);
  if (confirmMatch && confirmMatch[1]) {
    confirmToken = confirmMatch[1];
  }

  const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmToken}`;

  let totalSize = 0;
  let contentType = 'video/mp4';

  try {
    const headRes = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(cookies ? { Cookie: cookies } : {}),
        Range: 'bytes=0-0',
      },
    });

    const contentRange = headRes.headers.get('content-range');
    if (contentRange) {
      const parts = contentRange.split('/');
      if (parts[1]) totalSize = parseInt(parts[1], 10);
    }
    if (!totalSize) {
      const cl = headRes.headers.get('content-length');
      if (cl) totalSize = parseInt(cl, 10);
    }
    const ct = headRes.headers.get('content-type');
    if (ct && !ct.includes('text/html')) {
      contentType = ct;
    }
  } catch {}

  const info: DriveDirectInfo = {
    directUrl,
    cookies,
    totalSize,
    contentType,
    expiresAt: Date.now() + 3600000, // 1 hour TTL
  };

  driveDirectCache.set(fileId, info);
  return info;
}

export class SourcesController {
  static async getDriveFileInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.fileId || (req.query.fileId as string) || '';
      const fileId = extractDriveFileId(decodeURIComponent(rawParam));
      if (!fileId) throw new BadRequestError('Drive file ID is required');

      const info = await resolveDriveDirect(fileId);
      return sendSuccess(res, {
        fileId,
        totalSize: info.totalSize,
        totalSizeMB: (info.totalSize / (1024 * 1024)).toFixed(1),
        contentType: info.contentType,
        supportsRanges: true,
        defaultChunkMB: 50,
        lowChunkMB: 10,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDriveMediaInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.fileId || (req.query.fileId as string) || '';
      const fileId = extractDriveFileId(decodeURIComponent(rawParam));
      if (!fileId) throw new BadRequestError('Drive file ID is required');

      const cached = mediaInfoCache.get(fileId);
      if (cached && Date.now() - cached.timestamp < 3600000) {
        return sendSuccess(res, { audioTracks: cached.audioTracks, subtitleTracks: cached.subtitleTracks });
      }

      const info = await resolveDriveDirect(fileId);
      const { spawn } = await import('child_process');

      const ffprobeProc = spawn('ffprobe', [
        '-v', 'error',
        '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(info.cookies ? ['-headers', `Cookie: ${info.cookies}\r\n`] : []),
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '4',
        '-rw_timeout', '15000000',
        '-probesize', '8M',
        '-analyzeduration', '8M',
        '-show_entries', 'stream=index,codec_type,codec_name:stream_tags=language,title',
        '-of', 'json',
        info.directUrl,
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

      const info = await resolveDriveDirect(fileId);
      const { spawn } = await import('child_process');

      const ffmpegProc = spawn('ffmpeg', [
        '-v', 'error',
        '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(info.cookies ? ['-headers', `Cookie: ${info.cookies}\r\n`] : []),
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '4',
        '-rw_timeout', '20000000',
        '-probesize', '8M',
        '-analyzeduration', '8M',
        '-i', info.directUrl,
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

      const info = await resolveDriveDirect(fileId);

      if (req.query.redirect === 'true') {
        return res.redirect(302, info.directUrl);
      }

      // Check chunk buffering mode (YouTube-style 50MB normal vs 10MB low internet)
      const chunkMode = String(req.query.chunk || req.headers['x-buffer-chunk'] || '').toLowerCase();
      const quality = String(req.query.quality || req.query.res || 'auto').toLowerCase();
      const isLowBandwidth = chunkMode === '10mb' || quality === '360p' || quality === '480p';
      const chunkSize = isLowBandwidth ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB vs 50MB

      const audioTrackParam = req.query.audioTrack || req.query.audioIndex;
      const audioIndex = audioTrackParam !== undefined && audioTrackParam !== '' ? parseInt(String(audioTrackParam), 10) : null;
      const seekSec = Math.max(0, parseInt(String(req.query.t || req.query.time || req.query.start || '0'), 10) || 0);

      // Handle HEAD request for media probes
      if (req.method === 'HEAD') {
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', info.contentType || 'video/mp4');
        if (info.totalSize > 0) {
          res.setHeader('Content-Length', String(info.totalSize));
        }
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).end();
      }

      // If audio track > 0 or a downscaled transcode quality is explicitly forced,
      // run FFmpeg stream with fast keyframe seek.
      const requiresTranscode = (audioIndex !== null && !isNaN(audioIndex) && audioIndex > 0) ||
        (quality !== 'auto' && quality !== 'direct' && quality !== 'original' && quality !== 'passthrough');

      if (requiresTranscode) {
        const { spawn } = await import('child_process');
        const audioMap = (audioIndex !== null && !isNaN(audioIndex) && audioIndex > 0)
          ? `0:a:${audioIndex}`
          : '0:a:0';

        const is360p = quality === '360p' || quality === 'lowest';
        const is480p = quality === '480p' || quality === 'low' || quality === 'sd';
        const is720p = quality === '720p' || quality === 'hd';
        const is1080p = quality === '1080p' || quality === 'fhd';

        let videoCodecArgs: string[];
        let audioBitrate = '128k';

        if (is360p) {
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
          // Fast stream copy for high performance
          videoCodecArgs = ['-c:v', 'copy'];
          audioBitrate = '128k';
        }

        const ffmpegArgs = [
          '-v', 'error',
          '-hide_banner',
          '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...(info.cookies ? ['-headers', `Cookie: ${info.cookies}\r\n`] : []),
          '-reconnect', '1',
          '-reconnect_at_eof', '1',
          '-reconnect_streamed', '1',
          '-reconnect_delay_max', '4',
          '-rw_timeout', '25000000',
          '-probesize', '8M',
          '-analyzeduration', '8M',
          ...(seekSec > 0 ? ['-ss', String(seekSec)] : []),
          '-i', info.directUrl,
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
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Buffer-Chunk-Size', `${isLowBandwidth ? '10MB' : '50MB'}`);
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

        ffmpegProc.stdout.on('data', () => {
          hasData = true;
        });

        ffmpegProc.on('error', (err) => {
          cleanupProcess();
          if (!res.headersSent) {
            res.status(500).json({ error: 'FFmpeg transcode error', details: err.message });
          }
        });

        ffmpegProc.on('close', () => {
          if (!hasData && !res.headersSent) {
            res.status(500).json({ error: 'Playback stream failed to start.' });
          }
          cleanupProcess();
        });

        ffmpegProc.stdout.pipe(res);
        return;
      }

      // =========================================================================
      // YOUTUBE-STYLE CHUNKED HTTP RANGE STREAMING (50MB Normal / 10MB Low Data)
      // When user scrubs or forwards mouse cursor, requests new Range chunk instantly!
      // =========================================================================
      const rangeHeader = req.headers.range;
      let start = 0;
      let end = 0;

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        start = parseInt(parts[0], 10) || 0;
        const requestedEnd = parts[1] ? parseInt(parts[1], 10) : NaN;

        if (!isNaN(requestedEnd) && requestedEnd >= start) {
          end = Math.min(requestedEnd, start + chunkSize - 1);
        } else {
          // Open-ended Range: stream next 50MB (or 10MB) chunk from selected position
          end = start + chunkSize - 1;
        }
      } else {
        // No Range header provided: serve initial 50MB (or 10MB) chunk with 206
        start = 0;
        end = chunkSize - 1;
      }

      if (info.totalSize > 0 && end >= info.totalSize) {
        end = info.totalSize - 1;
      }

      const contentLen = Math.max(0, end - start + 1);

      res.status(206);
      res.setHeader('Content-Type', info.contentType && !info.contentType.includes('text/html') ? info.contentType : 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Range', `bytes ${start}-${end}/${info.totalSize > 0 ? info.totalSize : '*'}`);
      res.setHeader('Content-Length', String(contentLen));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Buffer-Chunk-Size', `${isLowBandwidth ? '10MB' : '50MB'}`);
      res.setHeader('X-Content-Type-Options', 'nosniff');

      const abortController = new AbortController();
      req.on('close', () => {
        abortController.abort();
      });

      try {
        const driveRes = await fetch(info.directUrl, {
          signal: abortController.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ...(info.cookies ? { Cookie: info.cookies } : {}),
            Range: `bytes=${start}-${end}`,
          },
        });

        if (!driveRes.ok && driveRes.status !== 206) {
          if (!res.headersSent) {
            return res.status(driveRes.status).end();
          }
          return;
        }

        if (driveRes.body) {
          const nodeStream = Readable.fromWeb(driveRes.body as any);
          nodeStream.pipe(res);
        } else {
          res.end();
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || req.destroyed) return;
        throw err;
      }
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
