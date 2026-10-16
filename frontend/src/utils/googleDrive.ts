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

  // If it's a URL, only accept Google Drive / Google domains
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (!trimmed.includes('google.com') && !trimmed.includes('googleusercontent.com')) {
      return '';
    }
    try {
      const parsed = new URL(trimmed);
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
    return '';
  }

  // If it's a raw file ID without slashes or query params
  if (!trimmed.includes('/') && !trimmed.includes('?') && !trimmed.includes('&') && !trimmed.includes(':')) {
    return trimmed;
  }

  return '';
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
  // If explicitly OTT or YouTube, never treat as Drive
  if (source.source_type === 'ott' || source.source_type === 'youtube') return false;
  if (source.source_type === 'google_drive' || source.source_type === 'drive') return true;

  const name = (source.provider_name || '').toLowerCase();
  const icon = (source.provider_icon || '').toLowerCase();
  const url = (source.external_url || '').toLowerCase();

  return (
    name.includes('google drive') ||
    name.includes('gdrive') ||
    name === 'drive' ||
    icon.includes('google_drive') ||
    icon === 'drive' ||
    url.includes('drive.google.com') ||
    url.includes('drive.usercontent.google.com') ||
    url.includes('docs.google.com')
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

