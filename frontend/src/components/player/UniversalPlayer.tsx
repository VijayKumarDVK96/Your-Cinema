import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
  Tooltip,
  TextField,
  ButtonGroup,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Slider,
  Paper,
  Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import MovieIcon from '@mui/icons-material/Movie';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import ClosedCaptionDisabledIcon from '@mui/icons-material/ClosedCaptionDisabled';
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward10Icon from '@mui/icons-material/Forward10';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import StayCurrentPortraitIcon from '@mui/icons-material/StayCurrentPortrait';
import SettingsIcon from '@mui/icons-material/Settings';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SpeedIcon from '@mui/icons-material/Speed';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PictureInPictureAltIcon from '@mui/icons-material/PictureInPictureAlt';
import PaletteIcon from '@mui/icons-material/Palette';
import TvIcon from '@mui/icons-material/Tv';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import {
  MediaPlayer,
  MediaProvider,
  Track,
  type MediaPlayerInstance,
} from '@vidstack/react';
import {
  defaultLayoutIcons,
  DefaultVideoLayout,
} from '@vidstack/react/player/layouts/default';

import { useQueryClient } from '@tanstack/react-query';
import { usePlayer } from '../../context/PlayerContext.js';
import { api } from '../../api/client.js';
import { getOttMeta, OttBadge } from '../../utils/ottProviders.js';
import { extractDriveFileId, getDrivePreviewUrl, getDriveViewUrl, isDriveSource } from '../../utils/googleDrive.js';
import { extractYouTubeId, getYouTubeEmbedUrl, isYouTubeSource } from '../../utils/youtube.js';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

interface AudioTrackInfo {
  id: string;
  index: number;
  globalIndex?: number;
  label: string;
  language: string;
  codec?: string;
  selected: boolean;
}

interface SubtitleTrackInfo {
  id: string;
  index: number;
  label: string;
  language: string;
  src: string;
  default: boolean;
}

export type PlayerThemeMode = 'jellyfin' | 'plex';

// Format time in 00:00:00 or 00:00
const formatPlaybackTime = (totalSeconds: number = 0): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const parsePlaybackInput = (input: string): number | null => {
  if (!input) return null;
  const clean = input.trim();
  const parts = clean.split(':').map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) {
    let total = 0;
    const hMatch = clean.match(/(\d+)\s*h/i);
    const mMatch = clean.match(/(\d+)\s*m/i);
    const sMatch = clean.match(/(\d+)\s*s/i);
    if (hMatch || mMatch || sMatch) {
      if (hMatch) total += parseInt(hMatch[1], 10) * 3600;
      if (mMatch) total += parseInt(mMatch[1], 10) * 60;
      if (sMatch) total += parseInt(sMatch[1], 10);
      return total;
    }
    const num = Number(clean);
    return isNaN(num) ? null : num * 60;
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0] * 60;
  }
  return null;
};

export const UniversalPlayer: React.FC = () => {
  const theme = useTheme();
  const isMobileOrTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { isOpen, activeMovie, activeSource, closePlayer, openPlayer } = usePlayer();
  const queryClient = useQueryClient();

  const initialSec = activeMovie?.playback_position_sec || 0;
  const currentSecRef = useRef<number>(initialSec);
  const initialSeekDoneRef = useRef<boolean>(false);
  const seekRetryTimerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playerKey, setPlayerKey] = useState<number>(0);
  const [isEditingTime, setIsEditingTime] = useState<boolean>(false);
  const [timeInputValue, setTimeInputValue] = useState<string>('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isAudioSwitching, setIsAudioSwitching] = useState<boolean>(false);

  // Player Theme mode: 'jellyfin' (cyan/purple glow) | 'plex' (amber/gold glow)
  const [playerThemeMode, setPlayerThemeMode] = useState<PlayerThemeMode>(() => {
    try {
      const saved = localStorage.getItem('yourcinema_player_theme');
      return saved === 'plex' ? 'plex' : 'jellyfin';
    } catch {
      return 'jellyfin';
    }
  });

  // OSD overlay stats for nerds / shortcuts
  const [showStatsForNerds, setShowStatsForNerds] = useState<boolean>(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);

  // Audio track management
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number>(0);
  const [audioMenuAnchor, setAudioMenuAnchor] = useState<null | HTMLElement>(null);

  // Subtitle track management & Default Subtitles toggle
  const [embeddedSubtitles, setEmbeddedSubtitles] = useState<SubtitleTrackInfo[]>([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string>('default');
  const [subtitleMenuAnchor, setSubtitleMenuAnchor] = useState<null | HTMLElement>(null);
  const [defaultSubtitlesEnabled, setDefaultSubtitlesEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('yourcinema_default_subtitles_enabled');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // Mobile / Tablet vertical view mode: 'contain' | 'vertical-fit' | 'fill'
  const [viewMode, setViewMode] = useState<'contain' | 'vertical-fit' | 'fill'>('contain');

  // Stream quality state: 'auto' | '1080p' | '720p' | '480p' | '360p' | 'direct'
  const [streamQuality, setStreamQuality] = useState<'auto' | '1080p' | '720p' | '480p' | '360p' | 'direct'>(() => {
    try {
      const saved = localStorage.getItem('yourcinema_stream_quality');
      return (saved as any) || 'auto';
    } catch {
      return 'auto';
    }
  });
  const [qualityMenuAnchor, setQualityMenuAnchor] = useState<null | HTMLElement>(null);

  // Playback speed selector anchor
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [speedMenuAnchor, setSpeedMenuAnchor] = useState<null | HTMLElement>(null);
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sound Mute & Volume state
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Ripple feedback for double tap seek
  const [seekFeedback, setSeekFeedback] = useState<{ type: 'rewind' | 'forward'; id: number } | null>(null);

  // Weak connection and buffer stall detection
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [showWeakNetworkHint, setShowWeakNetworkHint] = useState<boolean>(false);
  const bufferTimerRef = useRef<any>(null);
  const streamRecoveryAttemptsRef = useRef<number>(0);

  const handleThemeChange = (mode: PlayerThemeMode) => {
    setPlayerThemeMode(mode);
    setThemeMenuAnchor(null);
    try {
      localStorage.setItem('yourcinema_player_theme', mode);
    } catch {}
  };

  const vidstackPlayerRef = useRef<MediaPlayerInstance>(null);
  const ytPlayerRef = useRef<any>(null);

  const runtimeSec = Math.max((activeMovie?.runtime || 120) * 60, 600);

  // Reset seek and track states when a new movie/session opens
  useEffect(() => {
    if (isOpen) {
      initialSeekDoneRef.current = false;
      currentSecRef.current = initialSec;
      setStreamError(null);
      setIsAudioSwitching(false);
      setIsBuffering(false);
      setShowWeakNetworkHint(false);
      streamRecoveryAttemptsRef.current = 0;
      setAudioTracks([]);
      setSelectedAudioIndex(0);
      setEmbeddedSubtitles([]);
      setSelectedSubtitleId(defaultSubtitlesEnabled ? 'default' : 'off');
      setShowStatsForNerds(false);
      setShowShortcutsHelp(false);
    }
    return () => {
      if (seekRetryTimerRef.current) {
        clearTimeout(seekRetryTimerRef.current);
        seekRetryTimerRef.current = null;
      }
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }
    };
  }, [isOpen, activeMovie?.user_movie_id, initialSec, defaultSubtitlesEnabled]);

  // Fetch latest exact progress from database on mount / movie open
  useEffect(() => {
    if (!isOpen || !activeMovie?.user_movie_id) return;
    let isSubscribed = true;

    api.get(`/sources/movie/${activeMovie.user_movie_id}/progress`)
      .then((res) => {
        if (!isSubscribed) return;
        const p = res.data?.data?.last_played_position_sec;
        if (typeof p === 'number' && p > 0) {
          currentSecRef.current = p;
          initialSeekDoneRef.current = false;
          if (vidstackPlayerRef.current) {
            try {
              vidstackPlayerRef.current.currentTime = p;
              initialSeekDoneRef.current = true;
            } catch {}
          }
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, activeMovie?.user_movie_id]);

  const isDrive = isDriveSource(activeSource);
  const isYouTube =
    activeSource?.source_type === 'youtube' ||
    isYouTubeSource(activeSource) ||
    (!activeSource && Boolean(activeMovie?.trailer_url));
  const isOtt = activeSource?.source_type === 'ott' && !isYouTube && !isDrive;
  const ottMeta = isOtt && activeSource ? getOttMeta(activeSource.provider_name, activeSource.provider_icon) : null;

  // Google Drive URLs
  const driveFileId = isDrive
    ? extractDriveFileId(activeSource?.external_file_id || activeSource?.external_url)
    : '';
  const drivePreviewUrl = driveFileId ? getDrivePreviewUrl(driveFileId) : null;

  // Fetch embedded audio tracks and subtitles from backend ffprobe
  useEffect(() => {
    if (!isOpen || !isDrive || !driveFileId) return;
    let isSubscribed = true;

    api.get(`/sources/drive/${driveFileId}/media-info`)
      .then((res) => {
        if (!isSubscribed) return;
        const data = res.data?.data;
        if (data?.audioTracks && data.audioTracks.length > 0) {
          setAudioTracks(data.audioTracks);
          try {
            const pref = localStorage.getItem('yourcinema_preferred_audio_lang');
            if (pref) {
              const matched = data.audioTracks.find((t: any) => t.language?.toLowerCase() === pref.toLowerCase() || t.label?.toLowerCase().includes(pref.toLowerCase()));
              if (matched) setSelectedAudioIndex(matched.index || 0);
            }
          } catch {}
        }
        if (data?.subtitleTracks && data.subtitleTracks.length > 0) {
          setEmbeddedSubtitles(data.subtitleTracks);
          if (defaultSubtitlesEnabled) {
            const defTrack = data.subtitleTracks.find((t: any) => t.default) || data.subtitleTracks[0];
            setSelectedSubtitleId(defTrack.id);
          } else {
            setSelectedSubtitleId('off');
          }
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, isDrive, driveFileId, defaultSubtitlesEnabled]);

  // Save playback progress to backend
  const saveProgress = useCallback(
    async (sec: number, completed: boolean = false) => {
      if (!activeMovie) return;
      try {
        const safeSec = Math.max(0, Math.floor(sec));
        await api.post(`/sources/movie/${activeMovie.user_movie_id}/progress`, {
          positionSec: safeSec,
          completed,
          sourceId: activeSource?.id || null,
          sourceType: activeSource?.source_type || null,
        });
        queryClient.invalidateQueries({ queryKey: ['movie', activeMovie.user_movie_id] });
        queryClient.invalidateQueries({ queryKey: ['movies'] });
        queryClient.invalidateQueries({ queryKey: ['my-movies'] });
        queryClient.invalidateQueries({ queryKey: ['home'] });
      } catch (err) {
        // Ignore sync error
      }
    },
    [activeMovie, activeSource, queryClient]
  );

  // Seek handler with retry logic
  const performSeek = useCallback((targetSec: number, retries = 3) => {
    const player = vidstackPlayerRef.current;
    if (!player || targetSec <= 0) return;

    try {
      player.currentTime = targetSec;
      initialSeekDoneRef.current = true;
    } catch {
      if (retries > 0) {
        seekRetryTimerRef.current = setTimeout(() => {
          performSeek(targetSec, retries - 1);
        }, 500);
      }
    }
  }, []);

  // Audio track switcher
  const handleSelectAudioTrack = useCallback((trackIndex: number, trackLang?: string) => {
    const player = vidstackPlayerRef.current;
    const currentPos = player?.currentTime || currentSecRef.current;
    const safePos = Math.max(0, Math.floor(currentPos));

    setSelectedAudioIndex(trackIndex);
    setAudioMenuAnchor(null);
    setIsAudioSwitching(true);
    setStreamError(null);

    if (trackLang) {
      try {
        localStorage.setItem('yourcinema_preferred_audio_lang', trackLang);
      } catch {}
    }

    currentSecRef.current = safePos;
    initialSeekDoneRef.current = false;
    setPlayerKey((k) => k + 1);

    if (safePos > 0) {
      saveProgress(safePos, false);
    }
  }, [saveProgress]);

  // Stream quality switcher (Optimized transcode / weak internet / data saver presets)
  const handleSelectQuality = useCallback((quality: 'auto' | '1080p' | '720p' | '480p' | '360p' | 'direct') => {
    const player = vidstackPlayerRef.current;
    const currentPos = player?.currentTime || currentSecRef.current;
    const safePos = Math.max(0, Math.floor(currentPos));

    setStreamQuality(quality);
    setQualityMenuAnchor(null);
    setStreamError(null);
    setIsBuffering(false);
    setShowWeakNetworkHint(false);

    try {
      localStorage.setItem('yourcinema_stream_quality', quality);
    } catch {}

    currentSecRef.current = safePos;
    initialSeekDoneRef.current = false;
    setPlayerKey((k) => k + 1);

    if (safePos > 0) {
      saveProgress(safePos, false);
    }
  }, [saveProgress]);

  // Subtitle settings toggle
  const handleToggleDefaultSubtitles = (enabled: boolean) => {
    setDefaultSubtitlesEnabled(enabled);
    try {
      localStorage.setItem('yourcinema_default_subtitles_enabled', String(enabled));
    } catch {}
    if (!enabled) {
      setSelectedSubtitleId('off');
    } else if (embeddedSubtitles.length > 0) {
      setSelectedSubtitleId(embeddedSubtitles[0].id);
    }
  };

  const handleSelectSubtitleTrack = (subId: string) => {
    setSelectedSubtitleId(subId);
    setSubtitleMenuAnchor(null);
    const player = vidstackPlayerRef.current;
    if (player) {
      try {
        const tracks: any[] = Array.from(player.textTracks || []).filter(Boolean);
        tracks.forEach((t: any) => {
          if (t.kind === 'subtitles' || t.kind === 'captions') {
            t.mode = subId === 'off' ? 'disabled' : (t.id === subId || subId === 'default' ? 'showing' : 'disabled');
          }
        });
      } catch {}
    }
  };

  // Playback speed switcher
  const handleSelectSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    setSpeedMenuAnchor(null);
    if (vidstackPlayerRef.current) {
      try {
        vidstackPlayerRef.current.playbackRate = speed;
      } catch {}
    }
  };

  // Quick 10s skip handlers with visual feedback ripple
  const handleSkipSeconds = useCallback((delta: number) => {
    setSeekFeedback({ type: delta < 0 ? 'rewind' : 'forward', id: Date.now() });
    setTimeout(() => setSeekFeedback(null), 800);

    const player = vidstackPlayerRef.current;
    if (player) {
      const cur = player.currentTime || currentSecRef.current;
      const target = Math.max(0, Math.min(runtimeSec, cur + delta));
      player.currentTime = target;
      currentSecRef.current = target;
    } else if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      const cur = ytPlayerRef.current.getCurrentTime() || 0;
      const target = Math.max(0, Math.min(runtimeSec, cur + delta));
      ytPlayerRef.current.seekTo(target, true);
    }
  }, [isYouTube, runtimeSec]);

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    const elem = containerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Picture in Picture toggle
  const handleTogglePiP = () => {
    const player = vidstackPlayerRef.current;
    if (player) {
      try {
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
        } else if (player.provider && (player.provider as any).video) {
          (player.provider as any).video.requestPictureInPicture();
        }
      } catch {}
    }
  };

  // Keyboard hotkeys handler (Jellyfin / Plex shortcuts)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events if user is typing in timestamp text field
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          if (vidstackPlayerRef.current) {
            if (vidstackPlayerRef.current.paused) {
              vidstackPlayerRef.current.play();
            } else {
              vidstackPlayerRef.current.pause();
            }
          }
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          handleSkipSeconds(-10);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          handleSkipSeconds(10);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          if (vidstackPlayerRef.current) {
            vidstackPlayerRef.current.muted = !vidstackPlayerRef.current.muted;
            setIsMuted(vidstackPlayerRef.current.muted);
          }
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          setShowStatsForNerds((v) => !v);
          break;
        case '?':
          e.preventDefault();
          setShowShortcutsHelp((v) => !v);
          break;
        case 'Escape':
          if (showStatsForNerds) setShowStatsForNerds(false);
          if (showShortcutsHelp) setShowShortcutsHelp(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSkipSeconds, showStatsForNerds, showShortcutsHelp]);

  // YouTube IDs and embed URLs
  const ytRawUrl = activeSource?.external_url || activeMovie?.trailer_url || '';
  const ytId = extractYouTubeId(ytRawUrl);
  const ytEmbedUrl = ytId ? getYouTubeEmbedUrl(ytId, initialSec) : null;
  const ytContainerId = activeMovie ? `yt-embed-player-${activeMovie.user_movie_id}` : 'yt-embed-player';

  // YouTube player init
  useEffect(() => {
    if (!isOpen || !isYouTube || !ytId) return;

    let isSubscribed = true;
    let checkInterval: any = null;

    if (typeof window !== 'undefined' && !window.YT) {
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    }

    const initYt = () => {
      if (!isSubscribed) return;
      const elem = document.getElementById(ytContainerId);
      if (!elem || !window.YT?.Player) return;

      try {
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch (e) {}
          ytPlayerRef.current = null;
        }

        const player = new window.YT.Player(ytContainerId, {
          events: {
            onReady: (event: any) => {
              if (!isSubscribed) return;
              ytPlayerRef.current = event.target;
              try {
                const target = currentSecRef.current || initialSec;
                if (target > 0) {
                  event.target.seekTo(target, true);
                }
                event.target.playVideo();
              } catch (e) {}
            },
            onStateChange: (event: any) => {
              if (!isSubscribed) return;
              try {
                const cur = event.target.getCurrentTime();
                if (typeof cur === 'number' && !isNaN(cur)) {
                  currentSecRef.current = Math.floor(cur);
                }
              } catch (e) {}
              if (event.data === window.YT.PlayerState.PAUSED) {
                if (currentSecRef.current > 0) {
                  saveProgress(currentSecRef.current, false);
                }
              }
              if (event.data === window.YT.PlayerState.ENDED) {
                saveProgress(runtimeSec, true);
              }
            },
          },
        });
        ytPlayerRef.current = player;
      } catch (e) {}
    };

    if (window.YT?.Player) {
      const t = setTimeout(initYt, 100);
      return () => {
        isSubscribed = false;
        clearTimeout(t);
      };
    } else {
      checkInterval = setInterval(() => {
        if (window.YT?.Player) {
          clearInterval(checkInterval);
          initYt();
        }
      }, 250);

      const timeout = setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
      }, 5000);

      return () => {
        isSubscribed = false;
        if (checkInterval) clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen, isYouTube, ytId, ytContainerId, playerKey]);

  // Periodic timer for backend sync
  useEffect(() => {
    if (!isOpen || !activeMovie) return;

    const saveTimer = setInterval(() => {
      if (currentSecRef.current > 0) {
        saveProgress(currentSecRef.current, false);
      }
    }, 8000);

    return () => {
      clearInterval(saveTimer);
    };
  }, [isOpen, activeMovie, saveProgress]);

  if (!isOpen || !activeMovie) return null;

  const handleClose = () => {
    try {
      if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const t = ytPlayerRef.current.getCurrentTime();
        if (typeof t === 'number' && !isNaN(t) && t >= 0) {
          saveProgress(Math.floor(t), false);
        }
      } else if (currentSecRef.current > 0) {
        saveProgress(currentSecRef.current, false);
      }
    } catch (e) {}

    try {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
      }
    } catch (e) {}
    ytPlayerRef.current = null;

    if (seekRetryTimerRef.current) {
      clearTimeout(seekRetryTimerRef.current);
      seekRetryTimerRef.current = null;
    }

    setIsEditingTime(false);
    setAudioMenuAnchor(null);
    setSubtitleMenuAnchor(null);
    setStreamError(null);
    setIsAudioSwitching(false);
    closePlayer();
  };

  const handleSaveTimeInput = () => {
    const parsed = parsePlaybackInput(timeInputValue);
    if (parsed !== null && parsed >= 0) {
      currentSecRef.current = parsed;
      saveProgress(parsed, false);
      if (vidstackPlayerRef.current) {
        vidstackPlayerRef.current.currentTime = parsed;
      }
      setIsEditingTime(false);
    }
  };

  const handleStartOver = () => {
    currentSecRef.current = 0;
    initialSeekDoneRef.current = true;
    saveProgress(0, false);
    setIsEditingTime(false);
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
      } catch (e) {}
    } else if (vidstackPlayerRef.current) {
      vidstackPlayerRef.current.currentTime = 0;
      vidstackPlayerRef.current.play().catch(() => {});
    } else {
      setPlayerKey((k) => k + 1);
    }
  };

  const handleMarkFinished = () => {
    currentSecRef.current = runtimeSec;
    saveProgress(runtimeSec, true);
  };

  const effectiveAudioTracks: AudioTrackInfo[] = audioTracks;
  const hasMultipleAudio = effectiveAudioTracks.length > 1;

  const activeAudioTrack = effectiveAudioTracks.find((t) => t.index === selectedAudioIndex) || effectiveAudioTracks[0];
  const activeAudioLabel = activeAudioTrack?.label || 'Default Audio';

  const buildStreamSrc = (): string => {
    if (!driveFileId) return '';
    const params = new URLSearchParams();
    if (selectedAudioIndex > 0) {
      params.set('audioIndex', String(selectedAudioIndex));
    }
    const seekPos = Math.floor(currentSecRef.current || 0);
    if ((selectedAudioIndex > 0 || streamQuality !== 'auto') && seekPos > 0) {
      params.set('t', String(seekPos));
    }
    if (streamQuality !== 'auto') {
      params.set('quality', streamQuality);
    }
    const qs = params.toString();
    return `/api/sources/drive/${driveFileId}/stream${qs ? `?${qs}` : ''}`;
  };

  const streamSrc = buildStreamSrc();

  // Dynamic Theme Colors: Jellyfin Cyan/Purple vs Plex Amber/Gold
  const themeStyles = {
    jellyfin: {
      accentColor: '#00A4DC',
      secondaryAccent: '#AA5CC3',
      headerBg: 'linear-gradient(135deg, #0B0E17 0%, #151B2B 100%)',
      dialogBorder: '1px solid rgba(0, 164, 220, 0.35)',
      badgeBg: 'rgba(0, 164, 220, 0.2)',
      badgeText: '#00A4DC',
      glow: '0 0 20px rgba(0, 164, 220, 0.4)',
    },
    plex: {
      accentColor: '#E5A00D',
      secondaryAccent: '#F5C518',
      headerBg: 'linear-gradient(135deg, #0D0E12 0%, #1F232A 100%)',
      dialogBorder: '1px solid rgba(229, 160, 13, 0.35)',
      badgeBg: 'rgba(229, 160, 13, 0.2)',
      badgeText: '#E5A00D',
      glow: '0 0 20px rgba(229, 160, 13, 0.4)',
    },
  }[playerThemeMode];

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      fullScreen={isMobileOrTablet}
      PaperProps={{
        ref: containerRef,
        sx: {
          backgroundColor: '#05070D',
          border: isMobileOrTablet ? 'none' : themeStyles.dialogBorder,
          overflow: 'hidden',
          borderRadius: isMobileOrTablet ? 0 : 3,
          boxShadow: isMobileOrTablet ? 'none' : '0 24px 60px rgba(0, 0, 0, 0.95)',
          height: isMobileOrTablet ? '100dvh' : 'auto',
          maxHeight: isMobileOrTablet ? '100dvh' : '94vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
        },
      }}
    >
      {/* Jellyfin & Plex Top OSD Header Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.5, sm: 2.5 },
          py: 1.2,
          background: themeStyles.headerBg,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', minWidth: 0 }}>
          {/* Player Theme Indicator Badge */}
          <Chip
            avatar={<TvIcon sx={{ color: `${themeStyles.accentColor} !important`, fontSize: '14px !important' }} />}
            label={playerThemeMode === 'jellyfin' ? 'Jellyfin Web Player' : (playerThemeMode === 'plex' ? 'Plex Cinema Player' : 'Ultra HD Player')}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.72rem',
              backgroundColor: themeStyles.badgeBg,
              color: themeStyles.badgeText,
              fontWeight: 800,
              letterSpacing: '0.3px',
              border: `1px solid ${themeStyles.accentColor}40`,
            }}
          />

          <Typography
            variant="subtitle1"
            noWrap
            sx={{
              color: '#F8FAFC',
              fontWeight: 800,
              fontSize: { xs: '0.95rem', sm: '1.1rem' },
              maxWidth: { xs: '180px', sm: '320px', md: '450px' },
              fontFamily: '"Outfit", "Inter", sans-serif',
            }}
          >
            {activeMovie.title}
          </Typography>

          {activeMovie.release_date && (
            <Chip
              label={activeMovie.release_date.substring(0, 4)}
              size="small"
              sx={{ height: 20, fontSize: '0.68rem', backgroundColor: 'rgba(255,255,255,0.08)', color: '#CBD5E1', fontWeight: 700 }}
            />
          )}

          {isOtt && activeSource && (
            <OttBadge providerName={activeSource.provider_name} providerIcon={activeSource.provider_icon} size="small" />
          )}

          {isDrive && (
            <Chip
              label={
                streamQuality === 'auto'
                  ? 'Adaptive OTT Stream'
                  : streamQuality === 'direct'
                  ? 'Direct Pass-Through'
                  : `${streamQuality} Stream`
              }
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                backgroundColor: themeStyles.badgeBg,
                color: themeStyles.badgeText,
                fontWeight: 700,
                border: `1px solid ${themeStyles.accentColor}30`,
              }}
            />
          )}

          {isDrive && isAudioSwitching && (
            <Chip
              icon={<CircularProgress size={10} sx={{ color: `${themeStyles.accentColor} !important` }} />}
              label="Switching audio track..."
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                backgroundColor: 'rgba(229, 169, 60, 0.2)',
                color: '#E5A93C',
                fontWeight: 700,
              }}
            />
          )}

          {isDrive && isBuffering && (
            <Chip
              icon={<CircularProgress size={10} sx={{ color: '#F59E0B !important' }} />}
              label="Buffering..."
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                color: '#F59E0B',
                fontWeight: 700,
              }}
            />
          )}

          {isYouTube && (
            <Chip
              icon={<MovieIcon sx={{ fontSize: '13px !important', color: '#EF4444 !important' }} />}
              label={activeSource?.source_type === 'youtube' ? 'YouTube Stream' : 'Trailer'}
              size="small"
              sx={{ height: 22, fontSize: '0.72rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#F87171', fontWeight: 700 }}
            />
          )}
        </Box>

        {/* Right Header Action Icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          {/* Theme Switcher Button */}
          <Tooltip title="Switch Player Theme (Jellyfin / Plex)">
            <IconButton
              size="small"
              onClick={(e) => setThemeMenuAnchor(e.currentTarget)}
              sx={{ color: themeStyles.accentColor, backgroundColor: themeStyles.badgeBg, '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' } }}
            >
              <PaletteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={themeMenuAnchor}
            open={Boolean(themeMenuAnchor)}
            onClose={() => setThemeMenuAnchor(null)}
            PaperProps={{
              sx: {
                backgroundColor: '#0B1120',
                border: `1px solid ${themeStyles.accentColor}40`,
                color: '#FFF',
                minWidth: 200,
                borderRadius: 2,
              },
            }}
          >
            <Typography variant="caption" sx={{ px: 2, py: 0.5, color: '#94A3B8', fontWeight: 700, display: 'block' }}>
              PLAYER THEME
            </Typography>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />

            <MenuItem selected={playerThemeMode === 'jellyfin'} onClick={() => handleThemeChange('jellyfin')}>
              <Typography variant="body2" sx={{ color: playerThemeMode === 'jellyfin' ? '#00A4DC' : '#F8FAFC', fontWeight: playerThemeMode === 'jellyfin' ? 700 : 500 }}>
                Jellyfin Web Player (Cyan / Purple)
              </Typography>
              {playerThemeMode === 'jellyfin' && <CheckIcon sx={{ fontSize: 15, color: '#00A4DC', ml: 1 }} />}
            </MenuItem>

            <MenuItem selected={playerThemeMode === 'plex'} onClick={() => handleThemeChange('plex')}>
              <Typography variant="body2" sx={{ color: playerThemeMode === 'plex' ? '#E5A00D' : '#F8FAFC', fontWeight: playerThemeMode === 'plex' ? 700 : 500 }}>
                Plex Cinema Player (Gold / Amber)
              </Typography>
              {playerThemeMode === 'plex' && <CheckIcon sx={{ fontSize: 15, color: '#E5A00D', ml: 1 }} />}
            </MenuItem>
          </Menu>

          {/* Stats for Nerds Toggle */}
          <Tooltip title="Stats for Nerds / Playback Diagnostics (Key: I)">
            <IconButton
              size="small"
              onClick={() => setShowStatsForNerds((v) => !v)}
              sx={{
                color: showStatsForNerds ? themeStyles.accentColor : '#94A3B8',
                backgroundColor: showStatsForNerds ? themeStyles.badgeBg : 'rgba(255, 255, 255, 0.08)',
                '&:hover': { color: '#FFF', backgroundColor: 'rgba(255, 255, 255, 0.15)' },
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Keyboard Shortcuts Help */}
          <Tooltip title="Keyboard Shortcuts Guide (Key: ?)">
            <IconButton
              size="small"
              onClick={() => setShowShortcutsHelp((v) => !v)}
              sx={{
                color: showShortcutsHelp ? themeStyles.accentColor : '#94A3B8',
                backgroundColor: showShortcutsHelp ? themeStyles.badgeBg : 'rgba(255, 255, 255, 0.08)',
                '&:hover': { color: '#FFF', backgroundColor: 'rgba(255, 255, 255, 0.15)' },
              }}
            >
              <HelpOutlineIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>

          {/* Close Player Icon */}
          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              color: '#94A3B8',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              '&:hover': { color: '#FFF', backgroundColor: 'rgba(239, 68, 68, 0.7)' },
              p: 0.8,
            }}
            aria-label="Close"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Jellyfin & Plex Interactive Control Bar (Audio, Subtitles, Quality, Speed, View Mode) */}
      {(isDrive || isYouTube) && (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2.5 },
            py: 0.8,
            backgroundColor: 'rgba(10, 15, 26, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
            zIndex: 9,
          }}
        >
          {/* Left: Playback Info & Skip Buttons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={initialSec > 0 ? `Resumed at ${formatPlaybackTime(initialSec)}` : 'Playing from start'}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                color: '#CBD5E1',
              }}
            />

            {/* Quick 10s Rewind / Forward */}
            <Tooltip title="Rewind 10s (Left Arrow / J)">
              <IconButton
                size="small"
                onClick={() => handleSkipSeconds(-10)}
                sx={{ color: '#E2E8F0', backgroundColor: 'rgba(255, 255, 255, 0.06)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.15)', color: themeStyles.accentColor }, p: 0.5 }}
              >
                <Replay10Icon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Forward 10s (Right Arrow / L)">
              <IconButton
                size="small"
                onClick={() => handleSkipSeconds(10)}
                sx={{ color: '#E2E8F0', backgroundColor: 'rgba(255, 255, 255, 0.06)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.15)', color: themeStyles.accentColor }, p: 0.5 }}
              >
                <Forward10Icon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Right: Audio Track + Subtitles + Speed + Quality + Start Over + Drive Mode */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {/* Playback Speed Switcher */}
            {isDrive && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => setSpeedMenuAnchor(e.currentTarget)}
                  startIcon={<SpeedIcon sx={{ fontSize: '14px !important', color: playbackSpeed !== 1.0 ? themeStyles.accentColor : '#94A3B8' }} />}
                  endIcon={<ArrowDropDownIcon sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    borderColor: playbackSpeed !== 1.0 ? themeStyles.accentColor : 'rgba(255, 255, 255, 0.2)',
                    color: playbackSpeed !== 1.0 ? themeStyles.accentColor : '#CBD5E1',
                    backgroundColor: playbackSpeed !== 1.0 ? themeStyles.badgeBg : 'rgba(255, 255, 255, 0.04)',
                    fontSize: '11px',
                    fontWeight: 700,
                    py: 0.2,
                    px: 1,
                    textTransform: 'none',
                    '&:hover': { borderColor: themeStyles.accentColor, backgroundColor: themeStyles.badgeBg },
                  }}
                >
                  Speed: {playbackSpeed}x
                </Button>
                <Menu
                  anchorEl={speedMenuAnchor}
                  open={Boolean(speedMenuAnchor)}
                  onClose={() => setSpeedMenuAnchor(null)}
                  PaperProps={{
                    sx: { backgroundColor: '#0B1120', border: `1px solid ${themeStyles.accentColor}40`, color: '#FFF', minWidth: 140, borderRadius: 2 },
                  }}
                >
                  <Typography variant="caption" sx={{ px: 2, py: 0.5, color: '#94A3B8', fontWeight: 700, display: 'block' }}>
                    PLAYBACK SPEED
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                    <MenuItem key={s} selected={playbackSpeed === s} onClick={() => handleSelectSpeed(s)} sx={{ fontSize: '12px', py: 0.6 }}>
                      <Typography variant="body2" sx={{ fontSize: '12px', color: playbackSpeed === s ? themeStyles.accentColor : '#F8FAFC', fontWeight: playbackSpeed === s ? 700 : 500 }}>
                        {s === 1.0 ? 'Normal (1x)' : `${s}x`}
                      </Typography>
                      {playbackSpeed === s && <CheckIcon sx={{ fontSize: 14, color: themeStyles.accentColor, ml: 1 }} />}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            )}

            {/* Quality / Low Bandwidth Selector for Drive stream */}
            {isDrive && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => setQualityMenuAnchor(e.currentTarget)}
                  startIcon={<SettingsIcon sx={{ fontSize: '14px !important', color: streamQuality === 'auto' ? '#38BDF8' : (streamQuality === '480p' || streamQuality === '360p' ? '#F59E0B' : themeStyles.accentColor) }} />}
                  endIcon={<ArrowDropDownIcon sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    borderColor: streamQuality === 'auto' ? 'rgba(56, 189, 248, 0.4)' : (streamQuality === '480p' || streamQuality === '360p' ? 'rgba(245, 158, 11, 0.5)' : `${themeStyles.accentColor}60`),
                    color: streamQuality === 'auto' ? '#38BDF8' : (streamQuality === '480p' || streamQuality === '360p' ? '#F59E0B' : '#F8FAFC'),
                    backgroundColor: streamQuality === 'auto' ? 'rgba(56, 189, 248, 0.08)' : (streamQuality === '480p' || streamQuality === '360p' ? 'rgba(245, 158, 11, 0.1)' : themeStyles.badgeBg),
                    fontSize: '11px',
                    fontWeight: 700,
                    py: 0.2,
                    px: 1.2,
                    textTransform: 'none',
                    '&:hover': { borderColor: themeStyles.accentColor, backgroundColor: themeStyles.badgeBg },
                  }}
                >
                  Quality: {streamQuality === 'auto' ? 'Auto (Adaptive)' : (streamQuality === 'direct' ? 'Direct Pass-Through' : streamQuality)}
                </Button>
                <Menu
                  anchorEl={qualityMenuAnchor}
                  open={Boolean(qualityMenuAnchor)}
                  onClose={() => setQualityMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      backgroundColor: '#0B1120',
                      border: `1px solid ${themeStyles.accentColor}40`,
                      color: '#FFF',
                      minWidth: 260,
                      borderRadius: 2,
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ px: 2, py: 0.5, color: '#94A3B8', fontWeight: 700, display: 'block' }}>
                    STREAM QUALITY / BANDWIDTH PRESETS
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />

                  <MenuItem selected={streamQuality === 'auto'} onClick={() => handleSelectQuality('auto')} sx={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', py: 0.8 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: '12px', color: streamQuality === 'auto' ? themeStyles.accentColor : '#F8FAFC', fontWeight: streamQuality === 'auto' ? 700 : 500 }}>
                        ⚡ Auto (Fast Load & Smooth Stream)
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '10px', color: '#94A3B8' }}>
                        Adapts for weak & fast connections
                      </Typography>
                    </Box>
                    {streamQuality === 'auto' && <CheckIcon sx={{ fontSize: 15, color: themeStyles.accentColor, ml: 1.5 }} />}
                  </MenuItem>

                  <MenuItem selected={streamQuality === '720p'} onClick={() => handleSelectQuality('720p')} sx={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', py: 0.8 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: '12px', color: streamQuality === '720p' ? '#34D399' : '#F8FAFC', fontWeight: streamQuality === '720p' ? 700 : 500 }}>
                        🎬 720p HD (Balanced & Crisp)
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '10px', color: '#94A3B8' }}>
                        Ideal for normal broadband/WiFi
                      </Typography>
                    </Box>
                    {streamQuality === '720p' && <CheckIcon sx={{ fontSize: 15, color: '#34D399', ml: 1.5 }} />}
                  </MenuItem>

                  <MenuItem selected={streamQuality === '1080p'} onClick={() => handleSelectQuality('1080p')} sx={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', py: 0.8 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: '12px', color: streamQuality === '1080p' ? '#38BDF8' : '#F8FAFC', fontWeight: streamQuality === '1080p' ? 700 : 500 }}>
                        📺 1080p Full HD (High Quality)
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '10px', color: '#94A3B8' }}>
                        Maximum fidelity transcode
                      </Typography>
                    </Box>
                    {streamQuality === '1080p' && <CheckIcon sx={{ fontSize: 15, color: '#38BDF8', ml: 1.5 }} />}
                  </MenuItem>

                  <MenuItem selected={streamQuality === '480p'} onClick={() => handleSelectQuality('480p')} sx={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', py: 0.8 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: '12px', color: streamQuality === '480p' ? '#F59E0B' : '#F8FAFC', fontWeight: streamQuality === '480p' ? 700 : 500 }}>
                        📶 480p SD (Weak Connection)
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '10px', color: '#F59E0B' }}>
                        Buffers instantly on slow internet
                      </Typography>
                    </Box>
                    {streamQuality === '480p' && <CheckIcon sx={{ fontSize: 15, color: '#F59E0B', ml: 1.5 }} />}
                  </MenuItem>

                  <MenuItem selected={streamQuality === '360p'} onClick={() => handleSelectQuality('360p')} sx={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', py: 0.8 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: '12px', color: streamQuality === '360p' ? '#EF4444' : '#F8FAFC', fontWeight: streamQuality === '360p' ? 700 : 500 }}>
                        📉 360p Data Saver (Extreme Low Data)
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '10px', color: '#94A3B8' }}>
                        For 3G/throttled hotspot networks
                      </Typography>
                    </Box>
                    {streamQuality === '360p' && <CheckIcon sx={{ fontSize: 15, color: '#EF4444', ml: 1.5 }} />}
                  </MenuItem>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />

                  <MenuItem selected={streamQuality === 'direct'} onClick={() => handleSelectQuality('direct')} sx={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', py: 0.8 }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: '12px', color: streamQuality === 'direct' ? '#A855F7' : '#F8FAFC', fontWeight: streamQuality === 'direct' ? 700 : 500 }}>
                        🚀 Direct Pass-Through (Raw Source)
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '10px', color: '#94A3B8' }}>
                        Original file copy (Requires high-speed connection)
                      </Typography>
                    </Box>
                    {streamQuality === 'direct' && <CheckIcon sx={{ fontSize: 15, color: '#A855F7', ml: 1.5 }} />}
                  </MenuItem>
                </Menu>
              </>
            )}

            {/* Audio Track Selector for Drive */}
            {isDrive && hasMultipleAudio && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => setAudioMenuAnchor(e.currentTarget)}
                  startIcon={<AudiotrackIcon sx={{ fontSize: '14px !important', color: themeStyles.accentColor }} />}
                  endIcon={<ArrowDropDownIcon sx={{ fontSize: '14px !important' }} />}
                  disabled={isAudioSwitching}
                  sx={{
                    borderColor: `${themeStyles.accentColor}60`,
                    color: '#F8FAFC',
                    backgroundColor: themeStyles.badgeBg,
                    fontSize: '11px',
                    fontWeight: 700,
                    py: 0.2,
                    px: 1.2,
                    textTransform: 'none',
                    '&:hover': { borderColor: themeStyles.accentColor, backgroundColor: 'rgba(255,255,255,0.15)' },
                  }}
                >
                  Audio: {activeAudioLabel}
                </Button>
                <Menu
                  anchorEl={audioMenuAnchor}
                  open={Boolean(audioMenuAnchor)}
                  onClose={() => setAudioMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      backgroundColor: '#0B1120',
                      border: `1px solid ${themeStyles.accentColor}50`,
                      color: '#FFF',
                      minWidth: 220,
                      borderRadius: 2,
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ px: 2, py: 0.5, color: '#94A3B8', fontWeight: 700, display: 'block' }}>
                    SELECT AUDIO STREAM
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />
                  {effectiveAudioTracks.map((track) => {
                    const isSelected = track.index === selectedAudioIndex;
                    return (
                      <MenuItem
                        key={track.id}
                        selected={isSelected}
                        onClick={() => handleSelectAudioTrack(track.index, track.language)}
                        sx={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', py: 0.8 }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '12px', color: isSelected ? themeStyles.accentColor : '#F8FAFC', fontWeight: isSelected ? 700 : 500 }}>
                          {track.label || track.language || `Track ${track.index + 1}`}
                        </Typography>
                        {isSelected && <CheckIcon sx={{ fontSize: 15, color: themeStyles.accentColor, ml: 1.5 }} />}
                      </MenuItem>
                    );
                  })}
                </Menu>
              </>
            )}

            {/* Subtitle / CC Track Selector */}
            {isDrive && embeddedSubtitles.length > 0 && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => setSubtitleMenuAnchor(e.currentTarget)}
                  startIcon={
                    selectedSubtitleId === 'off' ? (
                      <ClosedCaptionDisabledIcon sx={{ fontSize: '14px !important', color: '#94A3B8' }} />
                    ) : (
                      <ClosedCaptionIcon sx={{ fontSize: '14px !important', color: '#10B981' }} />
                    )
                  }
                  endIcon={<ArrowDropDownIcon sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    borderColor: selectedSubtitleId === 'off' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(16, 185, 129, 0.5)',
                    color: selectedSubtitleId === 'off' ? '#94A3B8' : '#34D399',
                    backgroundColor: selectedSubtitleId === 'off' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(16, 185, 129, 0.1)',
                    fontSize: '11px',
                    fontWeight: 700,
                    py: 0.2,
                    px: 1.2,
                    textTransform: 'none',
                    '&:hover': { borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                  }}
                >
                  Subtitles: {selectedSubtitleId === 'off' ? 'Off' : (embeddedSubtitles.find((s) => s.id === selectedSubtitleId)?.label || 'On')}
                </Button>
                <Menu
                  anchorEl={subtitleMenuAnchor}
                  open={Boolean(subtitleMenuAnchor)}
                  onClose={() => setSubtitleMenuAnchor(null)}
                  PaperProps={{
                    sx: {
                      backgroundColor: '#0B1120',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#FFF',
                      minWidth: 230,
                      borderRadius: 2,
                      p: 0.5,
                    },
                  }}
                >
                  <Box sx={{ px: 1.5, py: 0.8, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 1.5, mb: 0.5 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={defaultSubtitlesEnabled}
                          onChange={(e) => handleToggleDefaultSubtitles(e.target.checked)}
                          sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#10B981' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#10B981' } }}
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: '11px' }}>
                          Auto Subtitles On
                        </Typography>
                      }
                      sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                    />
                  </Box>

                  <Typography variant="caption" sx={{ px: 1.5, py: 0.5, color: '#94A3B8', fontWeight: 700, display: 'block' }}>
                    SUBTITLE TRACKS
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />

                  <MenuItem
                    selected={selectedSubtitleId === 'off'}
                    onClick={() => handleSelectSubtitleTrack('off')}
                    sx={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', py: 0.8 }}
                  >
                    <Typography variant="body2" sx={{ fontSize: '12px', color: selectedSubtitleId === 'off' ? '#F87171' : '#CBD5E1', fontWeight: selectedSubtitleId === 'off' ? 700 : 500 }}>
                      Off (Disable Subtitles)
                    </Typography>
                    {selectedSubtitleId === 'off' && <CheckIcon sx={{ fontSize: 15, color: '#F87171', ml: 1.5 }} />}
                  </MenuItem>

                  {embeddedSubtitles.map((sub) => {
                    const isSelected = selectedSubtitleId === sub.id;
                    return (
                      <MenuItem
                        key={sub.id}
                        selected={isSelected}
                        onClick={() => handleSelectSubtitleTrack(sub.id)}
                        sx={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', py: 0.8 }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '12px', color: isSelected ? '#34D399' : '#F8FAFC', fontWeight: isSelected ? 700 : 500 }}>
                          {sub.label || `${sub.language.toUpperCase()} Subtitles`}
                        </Typography>
                        {isSelected && <CheckIcon sx={{ fontSize: 15, color: '#34D399', ml: 1.5 }} />}
                      </MenuItem>
                    );
                  })}
                </Menu>
              </>
            )}

            {/* Mobile / Tablet Vertical View Adaptor */}
            {isMobileOrTablet && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => setViewMode(viewMode === 'contain' ? 'vertical-fit' : (viewMode === 'vertical-fit' ? 'fill' : 'contain'))}
                startIcon={<StayCurrentPortraitIcon sx={{ fontSize: '13px !important', color: themeStyles.accentColor }} />}
                sx={{
                  borderColor: `${themeStyles.accentColor}60`,
                  color: themeStyles.accentColor,
                  fontSize: '11px',
                  py: 0.2,
                  px: 1,
                  textTransform: 'none',
                  fontWeight: 700,
                }}
              >
                {viewMode === 'contain' ? 'Fit View' : (viewMode === 'vertical-fit' ? 'Vertical View' : 'Fill Screen')}
              </Button>
            )}

            {/* Start Over */}
            <Tooltip title="Start over from 0:00">
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                onClick={handleStartOver}
                startIcon={<RestartAltIcon sx={{ fontSize: '13px !important' }} />}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#CBD5E1',
                  fontSize: '11px',
                  fontWeight: 600,
                  py: 0.2,
                  px: 1,
                  textTransform: 'none',
                  '&:hover': { borderColor: 'rgba(255, 255, 255, 0.4)', color: '#FFF' },
                }}
              >
                Start Over
              </Button>
            </Tooltip>

            {/* Mark Finished */}
            <Tooltip title="Mark movie as watched & completed">
              <Button
                size="small"
                variant="text"
                onClick={handleMarkFinished}
                startIcon={<CheckCircleIcon sx={{ fontSize: '13px !important', color: '#10B981' }} />}
                sx={{
                  color: '#10B981',
                  fontSize: '11px',
                  py: 0.2,
                  px: 0.8,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Mark Finished
              </Button>
            </Tooltip>

          </Stack>
        </Box>
      )}

      {/* Main Video Viewport */}
      <DialogContent
        sx={{
          p: 0,
          backgroundColor: '#000',
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          minHeight: isMobileOrTablet ? 'calc(100dvh - 100px)' : '580px',
        }}
      >
        {/* Double-tap ripple animation feedback */}
        {seekFeedback && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: seekFeedback.type === 'rewind' ? '25%' : '75%',
              transform: 'translate(-50%, -50%)',
              zIndex: 35,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.75)',
                border: `2px solid ${themeStyles.accentColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: themeStyles.glow,
                animation: 'ping 0.8s cubic-bezier(0, 0, 0.2, 1) infinite',
              }}
            >
              {seekFeedback.type === 'rewind' ? (
                <Replay10Icon sx={{ fontSize: 42, color: themeStyles.accentColor }} />
              ) : (
                <Forward10Icon sx={{ fontSize: 42, color: themeStyles.accentColor }} />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: '#FFF', fontWeight: 800, mt: 1, textShadow: '0 2px 4px #000' }}>
              {seekFeedback.type === 'rewind' ? '-10 SEC' : '+10 SEC'}
            </Typography>
          </Box>
        )}

        {/* Jellyfin / Plex "Stats for Nerds" Playback Diagnostics Overlay */}
        {showStatsForNerds && (
          <Fade in={showStatsForNerds}>
            <Paper
              elevation={24}
              sx={{
                position: 'absolute',
                top: 20,
                left: 20,
                zIndex: 40,
                backgroundColor: 'rgba(5, 7, 13, 0.92)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${themeStyles.accentColor}50`,
                borderRadius: 3,
                p: 2.5,
                minWidth: 320,
                maxWidth: 420,
                boxShadow: '0 16px 36px rgba(0,0,0,0.8)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ color: themeStyles.accentColor, fontWeight: 800, letterSpacing: '0.5px' }}>
                  📊 STATS FOR NERDS (PLAYBACK DIAGNOSTICS)
                </Typography>
                <IconButton size="small" onClick={() => setShowStatsForNerds(false)} sx={{ color: '#94A3B8', p: 0.3 }}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />

              <Stack spacing={0.8} sx={{ fontSize: '0.78rem', color: '#E2E8F0', fontFamily: 'monospace' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Player Engine:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#F8FAFC' }}>{playerThemeMode.toUpperCase()} Vidstack v1.15</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Source Type:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: themeStyles.accentColor }}>{isDrive ? 'Google Drive Transcode Proxy' : (isYouTube ? 'YouTube Embed API' : 'OTT DeepLink')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Stream Quality Preset:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#34D399' }}>{streamQuality === 'auto' ? 'Auto (Adaptive Low-Latency)' : (streamQuality === 'direct' ? 'Direct Pass-Through (Raw Source)' : streamQuality)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Network Buffer Health:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: isBuffering ? '#F59E0B' : '#34D399' }}>
                    {isBuffering ? 'Buffering (Adapting chunk)' : 'Stable (Continuous streaming)'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Active Audio Stream:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#F8FAFC' }}>{activeAudioLabel} (Index {selectedAudioIndex})</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Active Subtitle Track:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: selectedSubtitleId === 'off' ? '#F87171' : '#34D399' }}>{selectedSubtitleId}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Current Position:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#F8FAFC' }}>{formatPlaybackTime(currentSecRef.current)} / {formatPlaybackTime(runtimeSec)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>Playback Rate:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#F8FAFC' }}>{playbackSpeed}x</Typography>
                </Box>
              </Stack>
            </Paper>
          </Fade>
        )}

        {/* Jellyfin & Plex Keyboard Shortcuts Guide Overlay */}
        {showShortcutsHelp && (
          <Fade in={showShortcutsHelp}>
            <Paper
              elevation={24}
              sx={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 40,
                backgroundColor: 'rgba(5, 7, 13, 0.94)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${themeStyles.accentColor}50`,
                borderRadius: 3,
                p: 2.5,
                minWidth: 300,
                maxWidth: 380,
                boxShadow: '0 16px 36px rgba(0,0,0,0.8)',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ color: themeStyles.accentColor, fontWeight: 800 }}>
                  ⌨️ KEYBOARD SHORTCUTS
                </Typography>
                <IconButton size="small" onClick={() => setShowShortcutsHelp(false)} sx={{ color: '#94A3B8', p: 0.3 }}>
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1.5 }} />

              <Stack spacing={1}>
                {[
                  { key: 'Space / K', desc: 'Play / Pause video' },
                  { key: 'Left / Right Arrow (J / L)', desc: 'Seek -10s / +10s' },
                  { key: 'F', desc: 'Toggle Fullscreen' },
                  { key: 'M', desc: 'Toggle Mute' },
                  { key: 'I', desc: 'Stats for Nerds overlay' },
                  { key: 'Esc', desc: 'Close dialog or overlays' },
                ].map((item) => (
                  <Box key={item.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip label={item.key} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFF' }} />
                    <Typography variant="caption" sx={{ color: '#CBD5E1' }}>{item.desc}</Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Fade>
        )}

        {/* Stream Error Overlay */}
        {streamError && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.92)',
              zIndex: 35,
              p: 3,
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 52, color: '#F87171', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#F8FAFC', mb: 1, fontWeight: 700, textAlign: 'center' }}>
              Stream Interrupted
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3, textAlign: 'center', maxWidth: 440, lineHeight: 1.6 }}>
              {streamError}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
              <Button
                variant="contained"
                onClick={() => {
                  setStreamError(null);
                  setIsBuffering(false);
                  streamRecoveryAttemptsRef.current = 0;
                  setPlayerKey((k) => k + 1);
                }}
                sx={{ backgroundColor: themeStyles.accentColor, fontWeight: 700, textTransform: 'none', px: 3 }}
              >
                Retry Playback
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setStreamError(null);
                  handleSelectQuality('480p');
                }}
                sx={{ borderColor: '#F59E0B', color: '#F59E0B', fontWeight: 700, textTransform: 'none', px: 2.5 }}
              >
                Switch to 480p (Data Saver)
              </Button>
            </Stack>
          </Box>
        )}

        {/* Weak Connection Floating Hint / Quick Quality Switch Pill */}
        {showWeakNetworkHint && isBuffering && (
          <Fade in={showWeakNetworkHint}>
            <Paper
              elevation={16}
              sx={{
                position: 'absolute',
                bottom: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 35,
                backgroundColor: 'rgba(15, 23, 42, 0.94)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(245, 158, 11, 0.6)',
                borderRadius: 4,
                px: 2,
                py: 0.8,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                boxShadow: '0 8px 30px rgba(0,0,0,0.85)',
              }}
            >
              <CircularProgress size={16} sx={{ color: '#F59E0B' }} />
              <Typography variant="caption" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                Weak connection detected
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={() => {
                  setShowWeakNetworkHint(false);
                  handleSelectQuality('480p');
                }}
                sx={{
                  backgroundColor: '#F59E0B',
                  color: '#000',
                  fontWeight: 800,
                  fontSize: '11px',
                  py: 0.2,
                  px: 1.2,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': { backgroundColor: '#D97706' },
                }}
              >
                Switch to 480p SD
              </Button>
              <IconButton
                size="small"
                onClick={() => setShowWeakNetworkHint(false)}
                sx={{ color: '#94A3B8', p: 0.2 }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Paper>
          </Fade>
        )}

        {/* Jellyfin & Plex Modern OTT Video Player for Google Drive with Subtitles, Audio Tracks & Auto Vertical Adaptor */}
        {isDrive && driveFileId && (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              minHeight: isMobileOrTablet ? 'calc(100dvh - 100px)' : '580px',
              backgroundColor: '#000',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '& [data-media-player]': {
                width: '100%',
                height: '100%',
                minHeight: isMobileOrTablet ? 'calc(100dvh - 100px)' : '580px',
                backgroundColor: '#000',
                borderRadius: 0,
                objectFit: viewMode === 'fill' ? 'cover' : (viewMode === 'vertical-fit' ? 'scale-down' : 'contain'),
                '--media-captions-offset': '68px',
                '--media-cue-color': '#FFFFFF',
                '--media-cue-bg': 'rgba(10, 15, 26, 0.85)',
                '--media-cue-font-family': '"Outfit", "Inter", -apple-system, sans-serif',
                '--media-cue-font-size': 'clamp(1.05rem, 2.2vw, 1.45rem)',
                '--media-cue-font-weight': '700',
                '--media-cue-line-height': '1.4',
                '--media-cue-padding': '6px 14px',
                '--media-cue-border-radius': '8px',
                '--media-cue-text-shadow': '0 2px 6px rgba(0,0,0,0.95), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                '--media-cue-box-shadow': '0 4px 14px rgba(0,0,0,0.5)',
                '--media-brand': themeStyles.accentColor,
                '--video-brand': themeStyles.accentColor,
                '--video-focus-ring-color': themeStyles.accentColor,
              },
              '& .vds-video-layout': {
                '--video-brand': themeStyles.accentColor,
              },
              '& video': {
                objectFit: viewMode === 'fill' ? 'cover' : (viewMode === 'vertical-fit' ? 'contain' : 'contain'),
              },
              '& ::cue, & [data-part="cue"], & .vds-captions [data-part="cue"], & [data-media-captions] [data-part="cue"]': {
                color: '#FFFFFF !important',
                backgroundColor: 'rgba(10, 15, 26, 0.85) !important',
                backgroundImage: 'none !important',
                fontFamily: '"Outfit", "Inter", sans-serif !important',
                fontWeight: '700 !important',
                fontSize: 'clamp(1.05rem, 2.2vw, 1.45rem) !important',
                lineHeight: '1.4 !important',
                padding: '6px 14px !important',
                borderRadius: '8px !important',
                textShadow: '0 2px 6px rgba(0,0,0,0.95), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000 !important',
                boxShadow: '0 4px 14px rgba(0,0,0,0.5) !important',
                backdropFilter: 'blur(4px) !important',
              },
              '& [data-part="captions"], & .vds-captions, & media-captions': {
                bottom: '68px !important',
              },
            }}
            key={`vidstack-stream-${playerKey}-${activeMovie.user_movie_id}-audio${selectedAudioIndex}`}
          >
            <MediaPlayer
              ref={vidstackPlayerRef}
              title={activeMovie.title}
              src={{ src: streamSrc, type: 'video/mp4' }}
              storage={`yourcinema_playback_${activeMovie.user_movie_id}`}
              autoPlay
              playsInline
              load="eager"
              streamType="on-demand"
              onCanPlay={() => {
                setIsAudioSwitching(false);
                setIsBuffering(false);
                setShowWeakNetworkHint(false);
                streamRecoveryAttemptsRef.current = 0;
                if (!initialSeekDoneRef.current && currentSecRef.current > 0) {
                  if (selectedAudioIndex > 0) {
                    initialSeekDoneRef.current = true;
                  } else {
                    performSeek(currentSecRef.current);
                  }
                }
              }}
              onSeeked={(detail) => {
                const cur = Math.floor(typeof detail === 'number' ? detail : (detail as any)?.currentTime ?? 0);
                if (cur > 0) {
                  currentSecRef.current = cur;
                }
              }}
              onWaiting={() => {
                setIsBuffering(true);
                if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
                bufferTimerRef.current = setTimeout(() => {
                  setShowWeakNetworkHint(true);
                }, 4000);
              }}
              onPlaying={() => {
                setIsBuffering(false);
                setShowWeakNetworkHint(false);
                if (bufferTimerRef.current) {
                  clearTimeout(bufferTimerRef.current);
                  bufferTimerRef.current = null;
                }
              }}
              onTimeUpdate={(detail) => {
                const cur = Math.floor(detail.currentTime);
                if (cur > 0) {
                  currentSecRef.current = cur;
                }
              }}
              onPause={() => {
                const cur = Math.floor(vidstackPlayerRef.current?.currentTime || currentSecRef.current);
                if (cur > 0) {
                  saveProgress(cur, false);
                }
              }}
              onEnded={() => {
                saveProgress(runtimeSec, true);
              }}
              onError={() => {
                setIsAudioSwitching(false);
                setIsBuffering(false);
                if (streamRecoveryAttemptsRef.current < 2) {
                  streamRecoveryAttemptsRef.current += 1;
                  setTimeout(() => {
                    setPlayerKey((k) => k + 1);
                  }, 1200);
                } else {
                  setStreamError('Playback interrupted due to a network timeout or connection drop. You can retry or switch to Data Saver (480p SD).');
                }
              }}
            >
              <MediaProvider>
                {embeddedSubtitles.map((sub) => {
                  const isDefaultTrack =
                    selectedSubtitleId === sub.id ||
                    (selectedSubtitleId === 'default' && (sub.default || sub.id === embeddedSubtitles[0]?.id));
                  return (
                    <Track
                      key={sub.id}
                      src={sub.src}
                      kind="subtitles"
                      label={sub.label}
                      lang={sub.language}
                      type="vtt"
                      default={isDefaultTrack}
                    />
                  );
                })}
              </MediaProvider>
              <DefaultVideoLayout icons={defaultLayoutIcons} />
            </MediaPlayer>
          </Box>
        )}

        {isDrive && !drivePreviewUrl && (
          <Box sx={{ p: 4, textAlign: 'center', maxWidth: 480 }}>
            <Typography variant="h6" sx={{ color: '#F87171', mb: 1, fontWeight: 700 }}>
              Invalid Google Drive Link
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              The Google Drive file ID or URL provided for this movie could not be parsed. Please check the source configuration.
            </Typography>
          </Box>
        )}

        {/* Case 2: YouTube In-App Player (Trailer / Full Movie) */}
        {isYouTube && ytId && (
          <Box sx={{ width: '100%', height: '100%', minHeight: '560px', backgroundColor: '#000', position: 'relative' }} key={`yt-player-${playerKey}-${ytId}`}>
            <iframe
              id={ytContainerId}
              src={ytEmbedUrl || `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&playsinline=1`}
              title={`${activeMovie.title} YouTube Player`}
              width="100%"
              height="100%"
              style={{ border: 'none', backgroundColor: '#000', width: '100%', height: '100%', minHeight: '560px' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </Box>
        )}

        {isYouTube && !ytId && (
          <Box sx={{ p: 4, textAlign: 'center', maxWidth: 480 }}>
            <Typography variant="h6" sx={{ color: '#F87171', mb: 1, fontWeight: 700 }}>
              Invalid YouTube Link
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              The YouTube URL provided for this movie could not be parsed.
            </Typography>
          </Box>
        )}

        {/* Case 3: OTT Deep Link Launcher */}
        {isOtt && ottMeta && (
          <Box sx={{ p: 6, textAlign: 'center', maxWidth: 520 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, transform: 'scale(1.5)' }}>
              {ottMeta.icon}
            </Box>
            <Typography variant="h5" sx={{ mb: 1.5, fontWeight: 800, color: ottMeta.textColor }}>
              Stream on {ottMeta.name}
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3, lineHeight: 1.6 }}>
              "{activeMovie.title}" is available on {ottMeta.name}. Clicking below opens the official streaming portal.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                startIcon={<OpenInNewIcon />}
                href={activeSource.external_url || ottMeta.getDefaultSearchUrl(activeMovie.title)}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  backgroundColor: ottMeta.bgColor,
                  color: ottMeta.textColor,
                  fontWeight: 700,
                  px: 4,
                  py: 1.4,
                  '&:hover': { opacity: 0.9, backgroundColor: ottMeta.bgColor },
                }}
              >
                Launch on {ottMeta.name}
              </Button>
            </Stack>
          </Box>
        )}

        {/* Case 4: No Direct Playback Source Available */}
        {!isDrive && !isYouTube && !isOtt && (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: '#E2E8F0', mb: 1 }}>
              No Direct Playback Source Configured
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
              Associate a Google Drive file link, YouTube link, or OTT subscription from the movie details page.
            </Typography>
            {activeMovie.trailer_url && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<PlayArrowIcon />}
                onClick={() => openPlayer(activeMovie)}
              >
                Watch Official Trailer
              </Button>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
