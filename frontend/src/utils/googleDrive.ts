/**
 * Utilities for extracting Google Drive file IDs and constructing embed/preview URLs.
 */

export function extractDriveFileId(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();

  // Pattern: /file/d/<fileId> or /folders/<fileId> or /d/<fileId>
  const fileDMatch = trimmed.match(/\/(?:file\/d|folders|d)\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) {
    return fileDMatch[1];
  }

  // Pattern: ?id=<fileId> or &id=<fileId>
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) {
    return idParamMatch[1];
  }

  // If it's a raw file ID without slashes or query params
  if (!trimmed.includes('/') && !trimmed.includes('?') && !trimmed.includes('&')) {
    return trimmed;
  }

  // Fallback cleanup if someone pasted a path with queries
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const dIndex = segments.indexOf('d');
    if (dIndex !== -1 && segments[dIndex + 1]) {
      return segments[dIndex + 1];
    }
    const lastSeg = segments[segments.length - 1];
    if (lastSeg && lastSeg !== 'view' && lastSeg !== 'edit' && lastSeg !== 'preview') {
      return lastSeg;
    }
  } catch {
    // Ignore URL parse error
  }

  return trimmed;
}

export function getDrivePreviewUrl(fileIdOrUrl?: string | null): string {
  const fileId = extractDriveFileId(fileIdOrUrl);
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : '';
}

export function getDriveViewUrl(fileIdOrUrl?: string | null): string {
  const fileId = extractDriveFileId(fileIdOrUrl);
  return fileId ? `https://drive.google.com/file/d/${fileId}/view` : '';
}

export function isDriveSource(source?: {
  source_type?: string | null;
  provider_name?: string | null;
  provider_icon?: string | null;
  external_url?: string | null;
  external_file_id?: string | null;
} | null): boolean {
  if (!source) return false;
  if (source.source_type === 'google_drive') return true;
  const name = (source.provider_name || '').toLowerCase();
  const icon = (source.provider_icon || '').toLowerCase();
  const url = (source.external_url || '').toLowerCase();
  const fileId = source.external_file_id || '';
  return (
    name.includes('google drive') ||
    name.includes('gdrive') ||
    name === 'drive' ||
    icon.includes('google_drive') ||
    icon === 'drive' ||
    url.includes('drive.google.com') ||
    url.includes('drive.usercontent.google.com') ||
    Boolean(extractDriveFileId(url || fileId))
  );
}

export function getDriveDirectStreamUrl(fileIdOrUrl?: string | null): string {
  const fileId = extractDriveFileId(fileIdOrUrl);
  return fileId ? `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t` : '';
}

export function getDriveProxyStreamUrl(fileIdOrUrl?: string | null): string {
  const fileId = extractDriveFileId(fileIdOrUrl);
  return fileId ? `/api/sources/drive/${fileId}/stream` : '';
}

