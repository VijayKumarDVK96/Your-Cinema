import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { SourcesService, extractDriveFileId } from './sources.service.js';
import { MoviesService } from '../movies/movies.service.js';
import { TmdbService } from '../tmdb/tmdb.service.js';
import { pool, isPgConnected, inMemoryDb } from '../../db/index.js';
import { authenticate } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { BadRequestError } from '../../utils/errors.js';

const router = Router();

// Google Drive streaming endpoint (public media stream so HTML5 <video> can request with Range headers)
router.get(['/drive/:fileId/stream', '/drive/*'], async (req: Request, res: Response, next: NextFunction) => {
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
        if (h === 'content-type' && val.includes('octet-stream')) {
          res.setHeader('Content-Type', 'video/mp4');
        } else {
          res.setHeader(h, val);
        }
      }
    });

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
});

router.use(authenticate);


const addSourceSchema = z.object({
  userMovieId: z.string().min(1),
  sourceType: z.enum(['google_drive', 'youtube', 'ott', 'custom_url']),
  providerName: z.string().min(1),
  providerIcon: z.string().optional(),
  externalUrl: z.string().url().optional().nullable(),
  externalFileId: z.string().optional().nullable(),
  fileName: z.string().optional().nullable(),
  quality: z.string().optional(),
});

const progressSchema = z.object({
  positionSec: z.number().min(0),
  completed: z.boolean().optional(),
  sourceId: z.string().optional().nullable(),
  sourceType: z.string().optional().nullable(),
});

router.post('/detect/:userMovieId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userMovieId } = req.params;
    const userId = req.user!.id;

    // Get movie info to find tmdb_id
    const movie = await MoviesService.getMovieById(userId, userMovieId);
    const tmdbId = (movie as any).tmdb_id;
    if (!tmdbId) {
      return res.status(200).json({ success: true, data: movie.sources, added: 0 });
    }

    // Fetch from TMDB
    const detected = await TmdbService.getWatchProviders(tmdbId, movie.title, (movie as any).original_title);
    if (!detected || detected.length === 0) {
      return res.status(200).json({ success: true, data: movie.sources, added: 0 });
    }

    // Get existing provider names to skip duplicates
    const existingNames = new Set((movie.sources || []).map((s: any) => s.provider_name?.toLowerCase()));
    const toAdd = detected.filter((p: any) => !existingNames.has(p.providerName?.toLowerCase()));

    const newSources: any[] = [];
    if (isPgConnected) {
      for (const prov of toAdd) {
        const srcId = uuidv4();
        const { rows } = await pool.query(`
          INSERT INTO movie_sources (
            id, user_movie_id, source_type, provider_name, provider_icon, external_url, quality
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [srcId, userMovieId, prov.sourceType || 'ott', prov.providerName, prov.providerIcon, prov.externalUrl, prov.quality || '4K UHD']);
        newSources.push(rows[0]);
      }
    } else {
      for (const prov of toAdd) {
        const newSource = {
          id: `src-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          user_movie_id: userMovieId,
          source_type: prov.sourceType as any,
          provider_name: prov.providerName,
          provider_icon: prov.providerIcon,
          external_url: prov.externalUrl,
          external_file_id: null,
          file_name: null,
          quality: prov.quality || '4K UHD',
          created_at: new Date().toISOString(),
        };
        inMemoryDb.movieSources.set(newSource.id, newSource);
        newSources.push(newSource);
      }
    }

    const allSources = [...(movie.sources || []), ...newSources];
    return res.status(200).json({ success: true, data: allSources, added: newSources.length });
  } catch (err) {
    next(err);
  }
});

router.get('/movie/:userMovieId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sources = await SourcesService.listSources(req.params.userMovieId);
    return res.status(200).json({ success: true, data: sources });
  } catch (err) {
    next(err);
  }
});

router.get('/movie/:userMovieId/progress', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = await SourcesService.getPlaybackProgress(req.user!.id, req.params.userMovieId);
    return res.status(200).json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(addSourceSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const source = await SourcesService.addSource(req.user!.id, req.body);
    return res.status(201).json({ success: true, data: source });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SourcesService.deleteSource(req.user!.id, req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/movie/:userMovieId/progress', validate(progressSchema), async (req: Request, res: Response, next: NextFunction) => {
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
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/bulk-ott-preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
      throw new BadRequestError('Entries array is required');
    }
    const data = await SourcesService.bulkOttUpdatePreview(req.user!.id, entries);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/bulk-ott-apply', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      throw new BadRequestError('Updates array is required');
    }
    const data = await SourcesService.bulkOttUpdateApply(req.user!.id, updates);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
