/**
 * Utilities for detecting YouTube OTT/sources and launching directly in the YouTube app/browser with autoplay.
 */

export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  const match = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
  if (match && match[1]) return match[1];
  if (/^[\w-]{11}$/.test(cleanUrl)) return cleanUrl;
  return null;
}

export function getYouTubeEmbedUrl(urlOrId?: string | null, startSec: number = 0): string | null {
  const id = extractYouTubeId(urlOrId);
  if (!id) return null;
  const start = Math.max(0, Math.floor(startSec));
  const startParam = start > 0 ? `&start=${start}` : '';
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1${startParam}`;
}

export function isYouTubeSource(source?: {
  source_type?: string | null;
  provider_name?: string | null;
  provider_icon?: string | null;
  external_url?: string | null;
} | null): boolean {
  if (!source) return false;
  if (source.source_type === 'youtube') return true;
  const name = (source.provider_name || '').toLowerCase();
  const icon = (source.provider_icon || '').toLowerCase();
  const url = (source.external_url || '').toLowerCase();
  return (
    name.includes('youtube') ||
    icon.includes('youtube') ||
    url.includes('youtube.com') ||
    url.includes('youtu.be')
  );
}

export function formatYouTubeAutoplayUrl(rawUrl?: string | null, fallbackTitle?: string): string {
  const cleanUrl = (rawUrl || '').trim();

  if (!cleanUrl && fallbackTitle) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(fallbackTitle + ' full movie')}`;
  }
  if (!cleanUrl) return 'https://www.youtube.com';

  try {
    const parsed = new URL(cleanUrl);

    // youtu.be/<id>
    if (parsed.hostname.includes('youtu.be')) {
      const videoId = parsed.pathname.replace(/^\//, '');
      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;
      }
    }

    // youtube.com/embed/<id>
    if (parsed.pathname.includes('/embed/')) {
      const parts = parsed.pathname.split('/embed/');
      if (parts[1]) {
        const videoId = parts[1].split('?')[0];
        return `https://www.youtube.com/watch?v=${videoId}&autoplay=1`;
      }
    }

    // youtube.com/watch?v=<id>
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.searchParams.has('v')) {
        parsed.searchParams.set('autoplay', '1');
        return parsed.toString();
      }
    }
  } catch {
    // Regex fallback
    const match = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    if (match && match[1]) {
      return `https://www.youtube.com/watch?v=${match[1]}&autoplay=1`;
    }
  }

  // Generic fallback if URL doesn't have autoplay parameter
  if (cleanUrl.includes('?') && !cleanUrl.includes('autoplay=')) {
    return `${cleanUrl}&autoplay=1`;
  } else if (!cleanUrl.includes('?')) {
    return `${cleanUrl}?autoplay=1`;
  }

  return cleanUrl;
}

export function openYouTubeAutoplay(url?: string | null, fallbackTitle?: string): void {
  const targetUrl = formatYouTubeAutoplayUrl(url, fallbackTitle);
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}
