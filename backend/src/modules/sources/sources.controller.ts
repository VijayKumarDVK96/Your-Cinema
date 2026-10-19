import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { SourcesService, extractDriveFileId } from './sources.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { config } from '../../config/index.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';
import { BadRequestError, GoogleDriveError } from '../../utils/errors.js';
import { Logger } from '../../utils/logger.js';
import {
  GoogleDriveService,
  verifyDriveStreamToken,
} from './googleDrive.service.js';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const mediaInfoCache = new Map<string, { audioTracks: any[]; subtitleTracks: any[]; fileName?: string; isMkv?: boolean; isTranscoded?: boolean; timestamp: number }>();
const subtitleCache = new Map<string, string>();

interface DriveDirectInfo {
  directUrl: string;
  authHeaders?: Record<string, string>;
  cookies: string;
  totalSize: number;
  contentType: string;
  fileName?: string;
  isMkvOrNonMp4?: boolean;
  authMode?: 'user-oauth' | 'server-oauth' | 'api-key' | 'legacy';
  expiresAt: number;
}

const driveDirectCache = new Map<string, DriveDirectInfo>();

function driveCacheKey(fileId: string, userId?: string): string {
  return `${userId || 'anon'}:${fileId}`;
}

function resolveDriveUserId(req: Request, fileId: string): string | undefined {
  const raw = req.query.st;
  if (!raw || typeof raw !== 'string') return undefined;
  const userId = verifyDriveStreamToken(raw, fileId);
  if (!userId) {
    Logger.warn('Invalid or expired Google Drive stream token; falling back to anonymous access.');
    return undefined;
  }
  return userId;
}

async function resolveDriveInfo(fileId: string, userId?: string): Promise<DriveDirectInfo> {
  const cacheKey = driveCacheKey(fileId, userId);
  const cached = driveDirectCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  if (GoogleDriveService.isConfigured()) {
    try {
      const info = await GoogleDriveService.getDriveStreamSource(fileId, userId);
      const mapped: DriveDirectInfo = {
        ...info,
        authHeaders: info.authHeaders,
        cookies: '',
      };
      driveDirectCache.set(cacheKey, mapped);
      return mapped;
    } catch (err) {
      // If only the OAuth client is configured (no API key / server token) and
      // the user has not connected yet, public links can still fall back to the
      // legacy endpoint. All other API failures should surface clearly.
      if (
        err instanceof GoogleDriveError &&
        err.code === 'DRIVE_NOT_CONNECTED' &&
        !GoogleDriveService.hasApiKey() &&
        !GoogleDriveService.hasServerOAuth()
      ) {
        // Do not silently downgrade a connected account whose refresh token
        // failed; surface the reconnect error instead.
        const account = userId
          ? await GoogleDriveService.getDriveAccountStatus(userId)
          : null;
        if (account?.connected) throw err;

        Logger.warn(
          'Google Drive OAuth is configured but no account is connected; falling back to legacy download for this request.'
        );
      } else {
        throw err;
      }
    }
  } else {
    Logger.warn(
      'Google Drive API credentials are not configured. Using the legacy public download endpoint (quota-prone).'
    );
  }

  const legacy = await resolveLegacyDriveDirect(fileId);
  driveDirectCache.set(cacheKey, legacy);
  return legacy;
}

async function resolveLegacyDriveDirect(fileId: string): Promise<DriveDirectInfo> {
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

  return {
    directUrl,
    cookies,
    totalSize,
    contentType,
    fileName,
    isMkvOrNonMp4,
    authHeaders: {},
    authMode: 'legacy',
    expiresAt: Date.now() + 20 * 60 * 1000, // 20 min TTL
  };
}

function buildDriveRawProxyUrl(fileId: string, streamToken?: string): string {
  // FFmpeg/ffprobe must read through this proxy so every upstream request to
  // Google includes a Range header. The signed stream token selects the same
  // per-user OAuth account used by the browser request.
  const base = `http://127.0.0.1:${config.port}/api/sources/drive/${encodeURIComponent(fileId)}/raw`;
  return streamToken ? `${base}?st=${encodeURIComponent(streamToken)}` : base;
}

const activeSubtitleExtractions = new Map<string, Promise<string | null>>();

function findExistingSubtitleFile(fileId: string, trackIndex: number): string | null {
  const candidatePaths = [
    path.resolve(process.cwd(), 'cache', 'subtitles', `${fileId}_${trackIndex}.vtt`),
    path.resolve(process.cwd(), '..', 'cache', 'subtitles', `${fileId}_${trackIndex}.vtt`),
    path.resolve(process.cwd(), 'backend', 'cache', 'subtitles', `${fileId}_${trackIndex}.vtt`),
  ];
  return (
    candidatePaths.find((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).size > 500;
      } catch {
        return false;
      }
    }) || null
  );
}

async function extractSubtitleFile(
  fileId: string,
  trackIndex: number = 0,
  streamToken?: string
): Promise<string | null> {
  const existing = findExistingSubtitleFile(fileId, trackIndex);
  if (existing) return existing;

  const key = `${fileId}_${trackIndex}`;
  if (activeSubtitleExtractions.has(key)) {
    return activeSubtitleExtractions.get(key)!;
  }

  const promise = (async () => {
    const diskDir = path.resolve(process.cwd(), 'cache', 'subtitles');
    if (!fs.existsSync(diskDir)) fs.mkdirSync(diskDir, { recursive: true });
    const targetFile = path.join(diskDir, `${fileId}_${trackIndex}.vtt`);
    const tmpFile = `${targetFile}.tmp.${Date.now()}`;

    try {
      const ff = spawn('ffmpeg', [
        '-v', 'error',
        '-hide_banner',
        '-seekable', '1',
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '4',
        '-rw_timeout', '20000000',
        '-probesize', '2M',
        '-analyzeduration', '2M',
        '-i', buildDriveRawProxyUrl(fileId, streamToken),
        '-map', `0:s:${trackIndex}`,
        '-vn',
        '-an',
        '-c:s', 'webvtt',
        '-f', 'webvtt',
        '-y',
        tmpFile,
      ]);

      await new Promise<number>((resolve) => {
        ff.on('close', (code) => resolve(code ?? 1));
        ff.on('error', () => resolve(1));
        setTimeout(() => {
          try { ff.kill(); } catch {}
          resolve(1);
        }, 120000);
      });

      if (fs.existsSync(tmpFile)) {
        const sz = fs.statSync(tmpFile).size;
        if (sz > 500) {
          const content = fs.readFileSync(tmpFile, 'utf8');
          if (content.includes('WEBVTT')) {
            fs.renameSync(tmpFile, targetFile);
            subtitleCache.set(`${fileId}_${trackIndex}`, content);
            return targetFile;
          }
        }
        try { fs.unlinkSync(tmpFile); } catch {}
      }
      return null;
    } catch {
      try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch {}
      return null;
    } finally {
      activeSubtitleExtractions.delete(key);
    }
  })();

  activeSubtitleExtractions.set(key, promise);
  return promise;
}

async function describeDriveFailure(
  response: globalThis.Response
): Promise<string> {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const payload: any = await response.json();
      const message = payload?.error?.message;
      if (message) return `Google Drive API: ${message}`;
    } catch {}
  }

  if (response.status === 401) {
    return 'Google Drive authorization expired. Reconnect Google Drive in Settings.';
  }
  if (response.status === 403) {
    return 'Google Drive access denied. Connect the Google account that owns this file, or share it as "Anyone with the link".';
  }
  if (response.status === 404) {
    return 'Google Drive file not found or it is not shared with the connected account.';
  }
  if (response.status === 429) {
    return 'Google Drive API rate limit reached. Please retry in a moment.';
  }
  if (contentType.includes('text/html')) {
    return 'Google Drive returned an HTML page instead of video data. The file may be quota-limited or require a confirmation step. Please try again later.';
  }
  return `Google Drive stream source returned HTTP ${response.status}.`;
}

function driveFailureStatus(
  response: globalThis.Response,
  contentType: string
): number {
  if (contentType.includes('text/html')) return 502;
  if ([400, 401, 403, 404, 429].includes(response.status)) {
    return response.status;
  }
  return 502;
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
  capChunk: boolean,
  cacheKey?: string
): Promise<void> {
  const resolvedCacheKey = cacheKey || fileId;
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
        ...(info.authHeaders || {}),
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
      const failed = upstreamType.includes('text/html') ||
        upstreamType.includes('application/json') ||
        (!driveRes.ok && driveRes.status !== 206);
      if (failed) {
        driveDirectCache.delete(resolvedCacheKey);
        if (!res.headersSent) {
          const message = await describeDriveFailure(driveRes);
          res.status(driveFailureStatus(driveRes, upstreamType)).json({
            success: false,
            error: { code: 'DRIVE_UPSTREAM_ERROR', message },
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
      const failed = upstreamType.includes('text/html') ||
        upstreamType.includes('application/json') ||
        (!driveRes.ok && driveRes.status !== 206);
      if (failed) {
        driveDirectCache.delete(resolvedCacheKey);
        if (!res.headersSent) {
          const message = await describeDriveFailure(driveRes);
          res.status(driveFailureStatus(driveRes, upstreamType)).json({
            success: false,
            error: { code: 'DRIVE_UPSTREAM_ERROR', message },
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

      const userId = resolveDriveUserId(req, fileId);
      const info = await resolveDriveInfo(fileId, userId);
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
        authMode: info.authMode || 'legacy',
        apiKeyConfigured: GoogleDriveService.hasApiKey(),
        oauthConfigured: GoogleDriveService.isOAuthConfigured(),
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

      const userId = resolveDriveUserId(req, fileId);
      const streamToken = typeof req.query.st === 'string' ? req.query.st : '';
      const cacheKey = driveCacheKey(fileId, userId);

      const cached = mediaInfoCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 3600000) {
        return sendSuccess(res, {
          audioTracks: cached.audioTracks,
          subtitleTracks: cached.subtitleTracks,
          fileName: cached.fileName || '',
          isMkv: Boolean(cached.isMkv),
          isTranscoded: Boolean(cached.isTranscoded),
        });
      }

      const info = await resolveDriveInfo(fileId, userId);
      const { spawn } = await import('child_process');

      const ffprobeProc = spawn('ffprobe', [
        '-v', 'error',
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '4',
        '-rw_timeout', '10000000',
        '-probesize', '2M',
        '-analyzeduration', '2M',
        '-show_entries', 'stream=index,codec_type,codec_name:stream_tags=language,title',
        '-of', 'json',
        buildDriveRawProxyUrl(fileId, streamToken),
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
              const rawLang = (s.tags?.language || s.tags?.LANGUAGE || '').toLowerCase().trim();
              const title = s.tags?.title || s.tags?.TITLE || '';
              let langLabel = rawLang ? rawLang.toUpperCase() : '';
              if (['amh', 'lit', 'und'].includes(rawLang) || !rawLang) {
                langLabel = audioRelIdx === 0 ? 'English (Main)' : `Audio ${audioRelIdx + 1}`;
              } else if (rawLang === 'en' || rawLang === 'eng') {
                langLabel = 'English';
              }
              const label = title || `${langLabel} (${s.codec_name || 'audio'})`;
              const track = {
                id: `audio-${audioRelIdx}`,
                index: audioRelIdx,
                globalIndex: s.index,
                label,
                language: rawLang || 'en',
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
              const rawLang = (s.tags?.language || s.tags?.LANGUAGE || '').toLowerCase().trim();
              const title = s.tags?.title || s.tags?.TITLE || '';
              let langLabel = rawLang ? rawLang.toUpperCase() : '';
              if (['amh', 'lit', 'und'].includes(rawLang) || !rawLang) {
                langLabel = 'English';
              } else if (rawLang === 'en' || rawLang === 'eng') {
                langLabel = 'English';
              }
              const label = title || `${langLabel} Subtitles`;
              const track = {
                id: `sub-${subRelIdx}`,
                index: subRelIdx,
                streamIndex: s.index,
                label,
                language: rawLang || 'en',
                src: `/api/sources/drive/${fileId}/subtitles/${subRelIdx}`,
                default: subRelIdx === 0,
              };
              subRelIdx++;
              return track;
            });

          // Do not cache an empty probe result: it usually means Drive was
          // temporarily unreachable and would otherwise hide tracks for an hour.
          if (audioTracks.length > 0 || subtitleTracks.length > 0) {
            mediaInfoCache.set(cacheKey, {
              audioTracks,
              subtitleTracks,
              fileName: info.fileName,
              isMkv: Boolean(info.isMkvOrNonMp4),
              isTranscoded: Boolean(info.isMkvOrNonMp4),
              timestamp: Date.now(),
            });

            // Pre-extract default subtitle track in background if not already cached
            if (subtitleTracks.length > 0) {
              extractSubtitleFile(fileId, 0, streamToken).catch(() => {});
            }
          }
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

      const userId = resolveDriveUserId(req, fileId);
      const streamToken = typeof req.query.st === 'string' ? req.query.st : '';

      // 1. Check existing cached file on disk (instantly responds in < 15ms)
      const existingDiskPath = findExistingSubtitleFile(fileId, trackIndex);
      if (existingDiskPath) {
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.sendFile(existingDiskPath);
      }

      // 2. Check memory cache
      const cacheKey = `${driveCacheKey(fileId, userId)}_${trackIndex}`;
      const cached = subtitleCache.get(cacheKey) || subtitleCache.get(`${fileId}_${trackIndex}`);
      if (cached && cached.length > 500) {
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(cached);
      }

      // 3. Clean deduplicated background extraction to disk
      const extractedPath = await extractSubtitleFile(fileId, trackIndex, streamToken);
      if (extractedPath && fs.existsSync(extractedPath)) {
        res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.sendFile(extractedPath);
      }

      // 4. Fallback: return minimal valid empty VTT so client never hangs
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.send('WEBVTT\n\n');
    } catch (err) {
      next(err);
    }
  }

  static async streamDrive(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.fileId || req.params[0] || (req.query.fileId as string) || req.url || '';
      const fileId = extractDriveFileId(decodeURIComponent(rawParam));
      if (!fileId) throw new BadRequestError('Drive file ID is required');

      const userId = resolveDriveUserId(req, fileId);
      const streamToken = typeof req.query.st === 'string' ? req.query.st : '';
      const cacheKey = driveCacheKey(fileId, userId);
      const info = await resolveDriveInfo(fileId, userId);

      if (req.query.redirect === 'true') {
        if (info.authHeaders?.Authorization) {
          throw new BadRequestError(
            'OAuth-protected Drive files must be streamed through the range proxy, not redirected.'
          );
        }
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

        let videoCodecArgs: string[] = ['-c:v', 'copy'];
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
        }

        let audioCodecArgs: string[];

        if (is360p || is480p || is720p || is1080p) {
          audioCodecArgs = [
            '-c:a', 'aac',
            '-b:a', audioBitrate,
            '-ac', '2',
            '-af', 'aresample=async=1000:min_hard_comp=0.100000',
          ];
        } else {
          // Fast stream copy for high performance remux (MKV -> fragmented MP4 container)
          videoCodecArgs = ['-c:v', 'copy'];
          audioCodecArgs = ['-c:a', 'copy'];
        }

        const audioOffset = parseFloat((req.query.audioOffset as string) || '0') || 0;
        if (audioOffset !== 0) {
          audioCodecArgs = [
            '-c:a', 'aac',
            '-b:a', '160k',
            '-ac', '2',
            '-af', audioOffset > 0
              ? `adelay=${Math.round(audioOffset * 1000)}|${Math.round(audioOffset * 1000)}`
              : `atrim=start=${Math.abs(audioOffset)},asetpts=PTS-STARTPTS`,
          ];
        }

        const ffmpegArgs = [
          '-v', 'error',
          '-hide_banner',
          '-reconnect', '1',
          '-reconnect_at_eof', '1',
          '-reconnect_streamed', '1',
          '-reconnect_delay_max', '4',
          '-rw_timeout', '25000000',
          '-probesize', '2M',
          '-analyzeduration', '2M',
          ...(seekSec > 0 ? ['-ss', String(seekSec)] : []),
          '-i', buildDriveRawProxyUrl(fileId, streamToken),
          '-map', '0:v:0',
          '-map', `${audioMap}?`,
          ...videoCodecArgs,
          ...audioCodecArgs,
          '-max_muxing_queue_size', '4096',
          '-avoid_negative_ts', 'make_zero',
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
      await proxyDriveBytes(req, res, fileId, info, true, cacheKey);
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

      const userId = resolveDriveUserId(req, fileId);
      const cacheKey = driveCacheKey(fileId, userId);
      const info = await resolveDriveInfo(fileId, userId);
      await proxyDriveBytes(req, res, fileId, info, false, cacheKey);
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
   * Issues a short-lived, file-scoped signed token. The browser appends it to
   * Drive media URLs so public stream endpoints can select the user's OAuth
   * credentials without exposing the app JWT in media requests.
   */
  static async getDriveStreamToken(req: Request, res: Response, next: NextFunction) {
    try {
      const rawParam = req.params.fileId || '';
      const fileId = extractDriveFileId(decodeURIComponent(rawParam));
      if (!fileId) throw new BadRequestError('Drive file ID is required');

      const userId = req.user!.id;
      const status = await GoogleDriveService.getDriveAccountStatus(userId);
      const authMode = status.connected
        ? 'user-oauth'
        : status.serverOAuthConfigured
          ? 'server-oauth'
          : status.apiKeyConfigured
            ? 'api-key'
            : 'legacy';
      const token = status.connected || status.serverOAuthConfigured
        ? GoogleDriveService.createDriveStreamToken(userId, fileId)
        : null;

      return sendSuccess(res, {
        token,
        authMode,
        expiresIn: 12 * 60 * 60,
        connectedEmail: status.email,
        apiKeyConfigured: status.apiKeyConfigured,
        oauthConfigured: status.oauthConfigured,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getGoogleDriveAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await GoogleDriveService.getDriveAccountStatus(req.user!.id);
      return sendSuccess(res, status);
    } catch (err) {
      next(err);
    }
  }

  static async getGoogleDriveAuthUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const url = GoogleDriveService.buildGoogleDriveAuthUrl(req.user!.id);
      return sendSuccess(res, {
        url,
        redirectUri: config.googleDrive.redirectUri,
      });
    } catch (err) {
      next(err);
    }
  }

  static async disconnectGoogleDrive(req: Request, res: Response, next: NextFunction) {
    try {
      await GoogleDriveService.disconnectGoogleDrive(req.user!.id);
      return sendSuccess(res, { connected: false });
    } catch (err) {
      next(err);
    }
  }

  static async googleDriveCallback(req: Request, res: Response) {
    const clientBase = config.clientUrl.replace(/\/$/, '');
    try {
      const oauthError = typeof req.query.error === 'string' ? req.query.error : '';
      if (oauthError) {
        throw new Error(
          oauthError === 'access_denied'
            ? 'Google Drive connection was cancelled.'
            : `Google OAuth error: ${oauthError}`
        );
      }

      const code = typeof req.query.code === 'string' ? req.query.code : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      if (!code || !state) {
        throw new Error('Missing Google OAuth code or state.');
      }

      const userId = GoogleDriveService.verifyOAuthState(state);
      const { email } = await GoogleDriveService.completeGoogleDriveOAuth(userId, code);

      return res.redirect(
        `${clientBase}/settings?drive=connected&email=${encodeURIComponent(email)}`
      );
    } catch (err: any) {
      Logger.warn(`Google Drive OAuth callback failed: ${err?.message || err}`);
      return res.redirect(
        `${clientBase}/settings?drive=error&reason=${encodeURIComponent(
          err?.message || 'Google Drive connection failed'
        )}`
      );
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
