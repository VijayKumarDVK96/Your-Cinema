import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { SourcesService, extractDriveFileId } from './sources.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { config } from '../../config/index.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';
import { BadRequestError } from '../../utils/errors.js';

const mediaInfoCache = new Map<string, { audioTracks: any[]; subtitleTracks: any[]; fileName?: string; isMkv?: boolean; isTranscoded?: boolean; timestamp: number }>();
const subtitleCache = new Map<string, string>();

interface DriveDirectInfo {
  directUrl: string;
  cookies: string;
  totalSize: number;
  contentType: string;
  fileName?: string;
  isMkvOrNonMp4?: boolean;
  expiresAt: number;
}

const driveDirectCache = new Map<string, DriveDirectInfo>();

async function resolveDriveDirect(fileId: string): Promise<DriveDirectInfo> {
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

  let uuidToken = '';
  const uuidMatch = html1.match(/name="uuid"\s+value="([^"]+)"/) || html1.match(/uuid=([0-9a-zA-Z_-]+)/);
  if (uuidMatch && uuidMatch[1]) {
    uuidToken = uuidMatch[1];
  }

  const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmToken}${uuidToken ? `&uuid=${uuidToken}` : ''}`;

  let totalSize = 0;
  let contentType = 'video/mp4';
  let fileName = '';

  const fnMatch1 = html1.match(/<span class="uc-name-size"><a[^>]*>([^<]+)<\/a>/i) || html1.match(/<title>Google Drive - ([^<]+)<\/title>/i);
  if (fnMatch1 && fnMatch1[1]) {
    fileName = fnMatch1[1].trim();
  }

  try {
    const headRes = await fetch(directUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(cookies ? { Cookie: cookies } : {}),
        Range: 'bytes=0-0',
      },
    });

    const cd = headRes.headers.get('content-disposition');
    if (cd) {
      const fnMatch2 = cd.match(/filename\*?=(?:UTF-8'')?"?([^";\r\n]+)"?/i);
      if (fnMatch2 && fnMatch2[1]) {
        fileName = decodeURIComponent(fnMatch2[1].trim());
      }
    }

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

  const isMkvOrNonMp4 = Boolean(
    (fileName && !fileName.toLowerCase().endsWith('.mp4')) ||
    (contentType && (contentType.includes('matroska') || contentType.includes('mkv')))
  );

  const info: DriveDirectInfo = {
    directUrl,
    cookies,
    totalSize,
    contentType,
    fileName,
    isMkvOrNonMp4,
    expiresAt: Date.now() + 20 * 60 * 1000, // 20 min TTL
  };

  driveDirectCache.set(fileId, info);
  return info;
}

function buildDriveRawProxyUrl(fileId: string): string {
  // FFmpeg/ffprobe must read through this proxy so every upstream request to
  // Google includes a Range header. Without one, Drive returns an HTML
  // "quota exceeded / confirm download" page instead of video bytes.
  return `http://127.0.0.1:${config.port}/api/sources/drive/${encodeURIComponent(fileId)}/raw`;
}

/**
 * Streams byte ranges from Google Drive. Always sends a Range header upstream,
 * which avoids Drive's HTML confirmation/quota response and makes the stream
 * seekable by ffmpeg and the browser.
 */
async function proxyDriveBytes(
  req: Request,
  res: Response,
  fileId: string,
  info: DriveDirectInfo,
  capChunk: boolean
): Promise<void> {
  const chunkMode = String(req.query.chunk || req.headers['x-buffer-chunk'] || '').toLowerCase();
  const quality = String(req.query.quality || req.query.res || 'auto').toLowerCase();
  const isLowBandwidth = chunkMode === '10mb' || quality === '360p' || quality === '480p';
  const chunkSize = isLowBandwidth ? 10 * 1024 * 1024 : 50 * 1024 * 1024;

  const rangeHeader = req.headers.range;
  let start = 0;
  let end: number | null = null;

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    start = parseInt(parts[0], 10) || 0;
    const requestedEnd = parts[1] ? parseInt(parts[1], 10) : NaN;
    if (!isNaN(requestedEnd) && requestedEnd >= start) {
      end = capChunk ? Math.min(requestedEnd, start + chunkSize - 1) : requestedEnd;
    } else {
      end = capChunk ? start + chunkSize - 1 : null;
    }
  } else {
    start = 0;
    end = capChunk ? chunkSize - 1 : null;
  }

  const totalSize = info.totalSize;
  const finalEnd = end ?? (totalSize > 0 ? totalSize - 1 : null);

  if (totalSize > 0 && start >= totalSize) {
    res.setHeader('Content-Range', `bytes */${totalSize}`);
    res.status(416).end();
    return;
  }

  if (req.method === 'HEAD') {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'video/mp4');
    if (totalSize > 0) res.setHeader('Content-Length', String(totalSize));
    res.status(200).end();
    return;
  }

  const abortController = new AbortController();
  const onClientClose = () => abortController.abort();
  req.on('close', onClientClose);
  res.on('close', onClientClose);

  const fetchUpstream = async (from: number, to: number) => {
    return fetch(info.directUrl, {
      signal: abortController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...(info.cookies ? { Cookie: info.cookies } : {}),
        Range: `bytes=${from}-${to}`,
      },
    });
  };

  const writeUpstream = async (upstream: globalThis.Response) => {
    if (!upstream.body) return;
    const nodeStream = Readable.fromWeb(upstream.body as any);
    for await (const chunk of nodeStream) {
      if (abortController.signal.aborted) break;
      if (!res.write(chunk as Buffer)) {
        await new Promise<void>((resolve) => {
          const done = () => {
            res.off('drain', done);
            res.off('close', done);
            resolve();
          };
          res.once('drain', done);
          res.once('close', done);
        });
      }
    }
  };

  try {
    if (capChunk) {
      // Browser path: one bounded range chunk at a time. The browser asks for
      // the next chunk as it plays/scrubs.
      const driveRes = await fetchUpstream(start, finalEnd ?? start + chunkSize - 1);
      const upstreamType = driveRes.headers.get('content-type') || '';
      if (upstreamType.includes('text/html') || (!driveRes.ok && driveRes.status !== 206)) {
        driveDirectCache.delete(fileId);
        if (!res.headersSent) {
          res.status(upstreamType.includes('text/html') ? 502 : driveRes.status).json({
            success: false,
            error: {
              message: upstreamType.includes('text/html')
                ? 'Google Drive returned an HTML page instead of video data. The file may be quota-limited or require a confirmation step. Please try again later.'
                : `Google Drive stream source returned HTTP ${driveRes.status}.`,
            },
          });
        }
        return;
      }

      const contentRange = driveRes.headers.get('content-range');
      let actualStart = start;
      let actualEnd: number | null = finalEnd;
      let resolvedTotal = totalSize;
      if (contentRange) {
        const match = /bytes\s+(\d+)-(\d+)\/(\d+|\*)/i.exec(contentRange);
        if (match) {
          actualStart = parseInt(match[1], 10);
          actualEnd = parseInt(match[2], 10);
          if (match[3] !== '*') resolvedTotal = parseInt(match[3], 10);
        }
      }
      const contentLen = actualEnd !== null ? actualEnd - actualStart + 1 : NaN;

      res.status(206);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      if (actualEnd !== null) {
        res.setHeader('Content-Range', `bytes ${actualStart}-${actualEnd}/${resolvedTotal || '*'}`);
        if (!isNaN(contentLen) && contentLen > 0) res.setHeader('Content-Length', String(contentLen));
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('X-Buffer-Chunk-Size', isLowBandwidth ? '10MB' : '50MB');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      await pipeline(Readable.fromWeb(driveRes.body as any), res);
      return;
    }

    // FFmpeg/ffprobe path: present one continuous response but fetch it from
    // Drive in bounded 50MB ranges. A single full-file Range makes Drive
    // return its HTML quota page, while a bounded Range returns real bytes.
    res.status(206);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    if (finalEnd !== null && totalSize > 0) {
      res.setHeader('Content-Range', `bytes ${start}-${finalEnd}/${totalSize}`);
      res.setHeader('Content-Length', String(finalEnd - start + 1));
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const UPSTREAM_CHUNK = 50 * 1024 * 1024;
    let cursor = start;
    while (!abortController.signal.aborted && (finalEnd === null || cursor <= finalEnd)) {
      const chunkEnd = finalEnd === null
        ? cursor + UPSTREAM_CHUNK - 1
        : Math.min(cursor + UPSTREAM_CHUNK - 1, finalEnd);

      const driveRes = await fetchUpstream(cursor, chunkEnd);
      const upstreamType = driveRes.headers.get('content-type') || '';
      if (upstreamType.includes('text/html') || (!driveRes.ok && driveRes.status !== 206)) {
        driveDirectCache.delete(fileId);
        if (!res.headersSent) {
          res.status(upstreamType.includes('text/html') ? 502 : driveRes.status).json({
            success: false,
            error: {
              message: upstreamType.includes('text/html')
                ? 'Google Drive returned an HTML page instead of video data. The file may be quota-limited or require a confirmation step. Please try again later.'
                : `Google Drive stream source returned HTTP ${driveRes.status}.`,
            },
          });
        } else {
          res.end();
        }
        return;
      }

      const contentRange = driveRes.headers.get('content-range');
      let actualEnd = chunkEnd;
      if (contentRange) {
        const match = /bytes\s+(\d+)-(\d+)\/(\d+|\*)/i.exec(contentRange);
        if (match) actualEnd = parseInt(match[2], 10);
      }

      await writeUpstream(driveRes);

      if (abortController.signal.aborted) break;
      cursor = actualEnd + 1;

      if (actualEnd < chunkEnd) break; // end of file
    }

    if (!res.writableEnded) res.end();
  } catch (err: any) {
    if (
      err.name === 'AbortError' ||
      err.code === 'ABORT_ERR' ||
      err.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
      err.code === 'ECONNRESET' ||
      err.code === 'EPIPE' ||
      req.destroyed ||
      res.destroyed ||
      res.writableEnded
    ) {
      return;
    }
    throw err;
  } finally {
    req.off('close', onClientClose);
    res.off('close', onClientClose);
  }
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
        fileName: info.fileName || '',
        isMkv: Boolean(info.isMkvOrNonMp4),
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
        return sendSuccess(res, {
          audioTracks: cached.audioTracks,
          subtitleTracks: cached.subtitleTracks,
          fileName: cached.fileName || '',
          isMkv: Boolean(cached.isMkv),
          isTranscoded: Boolean(cached.isTranscoded),
        });
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
        buildDriveRawProxyUrl(fileId),
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

          mediaInfoCache.set(fileId, {
            audioTracks,
            subtitleTracks,
            fileName: info.fileName,
            isMkv: Boolean(info.isMkvOrNonMp4),
            isTranscoded: Boolean(info.isMkvOrNonMp4),
            timestamp: Date.now(),
          });
          return sendSuccess(res, {
            audioTracks,
            subtitleTracks,
            fileName: info.fileName || '',
            isMkv: Boolean(info.isMkvOrNonMp4),
            isTranscoded: Boolean(info.isMkvOrNonMp4),
          });
        } catch {
          return sendSuccess(res, {
            audioTracks: [],
            subtitleTracks: [],
            fileName: info.fileName || '',
            isMkv: Boolean(info.isMkvOrNonMp4),
            isTranscoded: Boolean(info.isMkvOrNonMp4),
          });
        }
      });

      ffprobeProc.on('error', () => {
        clearTimeout(timeout);
        return sendSuccess(res, {
          audioTracks: [],
          subtitleTracks: [],
          fileName: info.fileName || '',
          isMkv: Boolean(info.isMkvOrNonMp4),
          isTranscoded: Boolean(info.isMkvOrNonMp4),
        });
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
        '-i', buildDriveRawProxyUrl(fileId),
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
        res.setHeader('Content-Type', 'video/mp4');
        if (info.totalSize > 0) {
          res.setHeader('Content-Length', String(info.totalSize));
        }
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).end();
      }

      // Detect if the file is an MKV or non-MP4 container (not natively supported by HTML5 video in browsers)
      const isNonMp4 = Boolean(
        info.isMkvOrNonMp4 ||
        (info.fileName && !info.fileName.toLowerCase().endsWith('.mp4')) ||
        (info.contentType && (info.contentType.includes('matroska') || info.contentType.includes('mkv')))
      );

      // If audio track > 0, downscaled quality selected, or non-MP4 container (MKV),
      // run FFmpeg stream to transmux/transcode cleanly into fragmented MP4.
      const requiresTranscode = (audioIndex !== null && !isNaN(audioIndex) && audioIndex > 0) ||
        (quality !== 'auto' && quality !== 'direct' && quality !== 'original' && quality !== 'passthrough') ||
        isNonMp4;

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
          // Fast stream copy for high performance remux (e.g. MKV -> fragmented MP4 container)
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
          '-i', buildDriveRawProxyUrl(fileId),
          '-map', '0:v:0',
          '-map', `${audioMap}?`,
          ...videoCodecArgs,
          '-c:a', 'aac',
          '-b:a', audioBitrate,
          '-ac', '2',
          // Normalise timestamps so a restarted stream always begins at 0.
          // The client adds the requested seek offset back for display/progress.
          '-avoid_negative_ts', 'make_zero',
          '-reset_timestamps', '1',
          '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
          '-f', 'mp4',
          'pipe:1',
        ];

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'none');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Buffer-Chunk-Size', `${isLowBandwidth ? '10MB' : '50MB'}`);
        res.setHeader('X-Content-Type-Options', 'nosniff');

        const ffmpegProc = spawn('ffmpeg', ffmpegArgs);
        let hasData = false;
        let isCleanedUp = false;

        // Drain stderr so a chatty FFmpeg process can never block on a full pipe.
        ffmpegProc.stderr?.on('data', () => {});

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

        ffmpegProc.stdout.on('error', () => {
          cleanupProcess();
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

      // Delegate to the shared range proxy. capChunk=true preserves the
      // YouTube-style 10MB/50MB chunk window for browser playback.
      await proxyDriveBytes(req, res, fileId, info, true);
      return;
    } catch (err: any) {
      if (
        err.name === 'AbortError' ||
        err.code === 'ABORT_ERR' ||
        err.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
        err.code === 'ECONNRESET' ||
        err.code === 'EPIPE' ||
        req.destroyed ||
        res.destroyed
      ) {
        return;
      }
      next(err);
    }
  }

  /**
   * Raw, uncapped byte-range endpoint used by ffmpeg/ffprobe. Keeping media
   * processing on the same range proxy means Drive never sees a request
   * without a Range header (which would return its HTML quota page).
   */
  static async streamDriveRaw(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.fileId || req.params[0] || (req.query.fileId as string) || '';
      const fileId = extractDriveFileId(decodeURIComponent(rawParam));
      if (!fileId) throw new BadRequestError('Drive file ID is required');

      const info = await resolveDriveDirect(fileId);
      await proxyDriveBytes(req, res, fileId, info, false);
    } catch (err: any) {
      if (
        err.name === 'AbortError' ||
        err.code === 'ABORT_ERR' ||
        err.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
        err.code === 'ECONNRESET' ||
        err.code === 'EPIPE' ||
        req.destroyed ||
        res.destroyed
      ) {
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
