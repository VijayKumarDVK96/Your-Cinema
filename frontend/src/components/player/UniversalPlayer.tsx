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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MovieIcon from '@mui/icons-material/Movie';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClosedCaptionIcon from '@mui/icons-material/ClosedCaption';
import ClosedCaptionDisabledIcon from '@mui/icons-material/ClosedCaptionDisabled';
import Replay10Icon from '@mui/icons-material/Replay10';
import Forward10Icon from '@mui/icons-material/Forward10';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import StayCurrentPortraitIcon from '@mui/icons-material/StayCurrentPortrait';
import ScreenRotationIcon from '@mui/icons-material/ScreenRotation';
import SettingsIcon from '@mui/icons-material/Settings';
import AudiotrackIcon from '@mui/icons-material/Audiotrack';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

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

const formatPlaybackTime = (totalSeconds: number = 0): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
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
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const { isOpen, activeMovie, activeSource, closePlayer, openPlayer } = usePlayer();
  const queryClient = useQueryClient();

  const initialSec = activeMovie?.playback_position_sec || 0;
  const currentSecRef = useRef<number>(initialSec);
  const initialSeekDoneRef = useRef<boolean>(false);
  const seekRetryTimerRef = useRef<any>(null);
  const [playerKey, setPlayerKey] = useState<number>(0);
  const [isEditingTime, setIsEditingTime] = useState<boolean>(false);
  const [timeInputValue, setTimeInputValue] = useState<string>('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isAudioSwitching, setIsAudioSwitching] = useState<boolean>(false);

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

  // Direct Stream player (Vidstack) defaults to 'stream' for full OTT features
  const [driveMode, setDriveMode] = useState<'stream' | 'iframe'>('stream');

  const handleSetDriveMode = (mode: 'stream' | 'iframe') => {
    setDriveMode(mode);
    setStreamError(null);
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
      setAudioTracks([]);
      setSelectedAudioIndex(0);
      setEmbeddedSubtitles([]);
      setSelectedSubtitleId(defaultSubtitlesEnabled ? 'default' : 'off');
      setDriveMode('stream');
    }
    return () => {
      if (seekRetryTimerRef.current) {
        clearTimeout(seekRetryTimerRef.current);
        seekRetryTimerRef.current = null;
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
          // Attempt immediate seek if player is ready
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
  const driveEmbedSrc = drivePreviewUrl ? `${drivePreviewUrl}?autoplay=1` : '';
  const driveViewUrl = driveFileId ? getDriveViewUrl(driveFileId) : null;

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
          // Check if user has a preferred audio language saved
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
        // Ignore background sync errors
      }
    },
    [activeMovie, activeSource, queryClient]
  );

  // Robust seek handler with retry logic
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

  // Handle switching audio track with position preservation
  const handleSelectAudioTrack = useCallback((trackIndex: number, trackLang?: string) => {
    const player = vidstackPlayerRef.current;
    // Capture exact current playback position BEFORE any changes
    const currentPos = player?.currentTime || currentSecRef.current;
    const safePos = Math.max(0, Math.floor(currentPos));

    setSelectedAudioIndex(trackIndex);
    setAudioMenuAnchor(null);
    setIsAudioSwitching(true);
    setStreamError(null);

    // Save preferred language
    if (trackLang) {
      try {
        localStorage.setItem('yourcinema_preferred_audio_lang', trackLang);
      } catch {}
    }

    // If currently in iframe mode, switch to stream for audio control
    if (driveMode === 'iframe') {
      handleSetDriveMode('stream');
    }

    // Preserve position and force player reload with new audio track
    currentSecRef.current = safePos;
    initialSeekDoneRef.current = false;

    // Force player remount to load new stream URL
    setPlayerKey((k) => k + 1);

    // Save progress before switching so position is persisted
    if (safePos > 0) {
      saveProgress(safePos, false);
    }
  }, [driveMode, saveProgress]);

  // Handle default subtitles setting toggle
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

  // Handle selecting a subtitle track
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

  // Quick 10s skip handlers
  const handleSkipSeconds = (delta: number) => {
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
  };

  // YouTube IDs and embed URLs
  const ytRawUrl = activeSource?.external_url || activeMovie?.trailer_url || '';
  const ytId = extractYouTubeId(ytRawUrl);
  const ytEmbedUrl = ytId ? getYouTubeEmbedUrl(ytId, initialSec) : null;
  const ytContainerId = activeMovie ? `yt-embed-player-${activeMovie.user_movie_id}` : 'yt-embed-player';

  // YouTube integration if YouTube source
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
      } catch (e) {
        // Fallback to regular iframe
      }
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

  // Auto fullscreen on mobile when player opens
  useEffect(() => {
    if (!isOpen || !isMobileOrTablet) return;

    // Try to lock orientation to landscape on mobile for better video experience
    try {
      const screenOrientation = (screen as any).orientation;
      if (screenOrientation?.lock) {
        screenOrientation.lock('landscape').catch(() => {});
      }
    } catch {}

    return () => {
      try {
        const screenOrientation = (screen as any).orientation;
        if (screenOrientation?.unlock) {
          screenOrientation.unlock();
        }
      } catch {}
    };
  }, [isOpen, isMobileOrTablet]);

  if (!isOpen || !activeMovie) return null;

  // Handle closing player and persisting latest position
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
    } catch (e) {
      // Ignore save error on close
    }

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

  // Save manual timestamp input
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

  // Start Over handler
  const handleStartOver = () => {
    currentSecRef.current = 0;
    initialSeekDoneRef.current = true; // Prevent auto-seek to old position
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

  // Mark Finished handler
  const handleMarkFinished = () => {
    currentSecRef.current = runtimeSec;
    saveProgress(runtimeSec, true);
  };

  // Only show audio tracks from the media-info probe (no fake fallback tracks)
  const effectiveAudioTracks: AudioTrackInfo[] = audioTracks;
  const hasMultipleAudio = effectiveAudioTracks.length > 1;

  // Active audio label for display
  const activeAudioTrack = effectiveAudioTracks.find((t) => t.index === selectedAudioIndex) || effectiveAudioTracks[0];
  const activeAudioLabel = activeAudioTrack?.label || 'Default Audio';

  // Build stream URL with audio track and seek position for audio switching
  const buildStreamSrc = (): string => {
    if (!driveFileId) return '';
    const params = new URLSearchParams();
    if (selectedAudioIndex > 0) {
      params.set('audioIndex', String(selectedAudioIndex));
      // Pass current time for server-side seeking during audio switch
      const seekPos = Math.floor(currentSecRef.current || 0);
      if (seekPos > 0) {
        params.set('t', String(seekPos));
      }
    }
    const qs = params.toString();
    return `/api/sources/drive/${driveFileId}/stream${qs ? `?${qs}` : ''}`;
  };

  const streamSrc = buildStreamSrc();

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="xl"
      fullWidth
      fullScreen={isMobileOrTablet}
      PaperProps={{
        sx: {
          backgroundColor: '#05070D',
          border: isMobileOrTablet ? 'none' : '1px solid rgba(56, 189, 248, 0.25)',
          overflow: 'hidden',
          borderRadius: isMobileOrTablet ? 0 : 3,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.9)',
          height: isMobileOrTablet ? '100dvh' : 'auto',
          maxHeight: isMobileOrTablet ? '100dvh' : '92vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Top OTT Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.5, sm: 2.5 },
          py: 1.2,
          background: 'linear-gradient(to bottom, #0F172A, #070A12)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            noWrap
            sx={{
              color: '#F8FAFC',
              fontWeight: 800,
              fontSize: { xs: '0.95rem', sm: '1.1rem' },
              maxWidth: { xs: '180px', sm: '350px', md: '500px' },
            }}
          >
            {activeMovie.title}
          </Typography>

          {isOtt && activeSource && (
            <OttBadge providerName={activeSource.provider_name} providerIcon={activeSource.provider_icon} size="small" />
          )}

          {isDrive && (
            <Chip
              label={driveMode === 'iframe' ? 'Google Drive Player' : 'OTT Ultra HD Stream'}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                backgroundColor: driveMode === 'iframe' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: driveMode === 'iframe' ? '#34D399' : '#38BDF8',
                fontWeight: 700,
              }}
            />
          )}

          {isDrive && isAudioSwitching && (
            <Chip
              icon={<CircularProgress size={10} sx={{ color: '#E5A93C !important' }} />}
              label="Switching audio..."
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

          {isYouTube && (
            <Chip
              icon={<MovieIcon sx={{ fontSize: '13px !important', color: '#EF4444 !important' }} />}
              label={activeSource?.source_type === 'youtube' ? 'YouTube Stream' : 'Trailer'}
              size="small"
              sx={{ height: 22, fontSize: '0.72rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#F87171', fontWeight: 700 }}
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Quick timestamp edit */}
          {isDrive && driveMode === 'stream' && !isMobileOrTablet && (
            <>
              {isEditingTime ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8 }}>
                  <TextField
                    size="small"
                    placeholder="e.g. 1:01:20"
                    value={timeInputValue}
                    onChange={(e) => setTimeInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTimeInput();
                      if (e.key === 'Escape') setIsEditingTime(false);
                    }}
                    autoFocus
                    sx={{
                      width: 90,
                      '& .MuiInputBase-input': { py: 0.2, px: 0.8, fontSize: '11px', color: '#FFF' },
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        '& fieldset': { borderColor: '#38BDF8' },
                      },
                    }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveTimeInput}
                    sx={{ minWidth: 'auto', py: 0.2, px: 1, fontSize: '11px', backgroundColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
                  >
                    Save
                  </Button>
                </Box>
              ) : (
                <Tooltip title="Save custom timestamp">
                  <IconButton
                    size="small"
                    onClick={() => {
                      const cur = vidstackPlayerRef.current?.currentTime || currentSecRef.current;
                      setTimeInputValue(cur > 0 ? formatPlaybackTime(cur) : '');
                      setIsEditingTime(true);
                    }}
                    sx={{ color: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.1)', '&:hover': { backgroundColor: 'rgba(56, 189, 248, 0.2)' } }}
                  >
                    <BookmarkIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}

          <IconButton
            onClick={handleClose}
            size="small"
            sx={{
              color: '#94A3B8',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              '&:hover': { color: '#FFF', backgroundColor: 'rgba(239, 68, 68, 0.6)' },
              p: 0.8,
            }}
            aria-label="Close"
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* OTT Interactive Control Bar (Audio, Subtitles, Views, Modes) */}
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
            <Tooltip title="Rewind 10 seconds">
              <IconButton
                size="small"
                onClick={() => handleSkipSeconds(-10)}
                sx={{ color: '#E2E8F0', backgroundColor: 'rgba(255, 255, 255, 0.06)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#38BDF8' }, p: 0.5 }}
              >
                <Replay10Icon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Forward 10 seconds">
              <IconButton
                size="small"
                onClick={() => handleSkipSeconds(10)}
                sx={{ color: '#E2E8F0', backgroundColor: 'rgba(255, 255, 255, 0.06)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.15)', color: '#38BDF8' }, p: 0.5 }}
              >
                <Forward10Icon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Right: Audio Track Switcher + Subtitles Switcher + Start Over + Drive Mode */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {/* Audio Track Selector for Drive (only show if multiple tracks detected) */}
            {isDrive && hasMultipleAudio && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => setAudioMenuAnchor(e.currentTarget)}
                  startIcon={<AudiotrackIcon sx={{ fontSize: '14px !important', color: '#38BDF8' }} />}
                  endIcon={<ArrowDropDownIcon sx={{ fontSize: '14px !important' }} />}
                  disabled={isAudioSwitching}
                  sx={{
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    color: '#F8FAFC',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)',
                    fontSize: '11px',
                    fontWeight: 700,
                    py: 0.2,
                    px: 1.2,
                    textTransform: 'none',
                    '&:hover': { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.2)' },
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
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#FFF',
                      minWidth: 220,
                      borderRadius: 2,
                    },
                  }}
                >
                  <Typography variant="caption" sx={{ px: 2, py: 0.5, color: '#94A3B8', fontWeight: 700, display: 'block' }}>
                    SELECT AUDIO TRACK
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
                        <Typography variant="body2" sx={{ fontSize: '12px', color: isSelected ? '#38BDF8' : '#F8FAFC', fontWeight: isSelected ? 700 : 500 }}>
                          {track.label || track.language || `Track ${track.index + 1}`}
                        </Typography>
                        {isSelected && <CheckIcon sx={{ fontSize: 15, color: '#38BDF8', ml: 1.5 }} />}
                      </MenuItem>
                    );
                  })}
                </Menu>
              </>
            )}

            {/* Subtitle / CC Track Selector & Default Enable/Disable Settings */}
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
                          Default Subtitles On
                        </Typography>
                      }
                      sx={{ m: 0, width: '100%', justifyContent: 'space-between' }}
                    />
                  </Box>

                  <Typography variant="caption" sx={{ px: 1.5, py: 0.5, color: '#94A3B8', fontWeight: 700, display: 'block' }}>
                    SUBTITLE TRACKS
                  </Typography>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />

                  {/* Off Option */}
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

                  {/* Available Subtitle Tracks */}
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
                startIcon={<StayCurrentPortraitIcon sx={{ fontSize: '13px !important', color: '#E5A93C' }} />}
                sx={{
                  borderColor: 'rgba(229, 169, 60, 0.4)',
                  color: '#E5A93C',
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

            {/* Drive Mode switcher */}
            {isDrive && driveFileId && !isMobileOrTablet && (
              <ButtonGroup size="small" variant="outlined" sx={{ backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 1.5 }}>
                <Tooltip title="OTT Direct Stream with Audio Track switching & Subtitles">
                  <Button
                    onClick={() => handleSetDriveMode('stream')}
                    startIcon={<GraphicEqIcon sx={{ fontSize: '13px !important' }} />}
                    sx={{
                      fontSize: '11px',
                      textTransform: 'none',
                      fontWeight: driveMode === 'stream' ? 700 : 500,
                      backgroundColor: driveMode === 'stream' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                      color: driveMode === 'stream' ? '#38BDF8' : '#94A3B8',
                      borderColor: driveMode === 'stream' ? '#0284C7' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    OTT Stream
                  </Button>
                </Tooltip>
                <Tooltip title="Google Drive Built-in Player (CC Subtitles & Native Player)">
                  <Button
                    onClick={() => handleSetDriveMode('iframe')}
                    startIcon={<VolumeUpIcon sx={{ fontSize: '13px !important' }} />}
                    sx={{
                      fontSize: '11px',
                      textTransform: 'none',
                      fontWeight: driveMode === 'iframe' ? 700 : 500,
                      backgroundColor: driveMode === 'iframe' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                      color: driveMode === 'iframe' ? '#34D399' : '#94A3B8',
                      borderColor: driveMode === 'iframe' ? '#059669' : 'rgba(255,255,255,0.15)',
                    }}
                  >
                    Drive Iframe
                  </Button>
                </Tooltip>
              </ButtonGroup>
            )}
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
              backgroundColor: 'rgba(0,0,0,0.85)',
              zIndex: 20,
              p: 3,
            }}
          >
            <ErrorOutlineIcon sx={{ fontSize: 48, color: '#F87171', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#F8FAFC', mb: 1, fontWeight: 700, textAlign: 'center' }}>
              Stream Error
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3, textAlign: 'center', maxWidth: 400 }}>
              {streamError}
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={() => {
                  setStreamError(null);
                  setPlayerKey((k) => k + 1);
                }}
                sx={{ backgroundColor: '#0284C7', fontWeight: 700, textTransform: 'none' }}
              >
                Retry Stream
              </Button>
              <Button
                variant="outlined"
                onClick={() => handleSetDriveMode('iframe')}
                sx={{ borderColor: '#34D399', color: '#34D399', fontWeight: 700, textTransform: 'none' }}
              >
                Use Drive Player
              </Button>
            </Stack>
          </Box>
        )}

        {/* Case 1a: Vidstack Modern OTT Video Player for Google Drive with Subtitles, Audio Tracks & Auto Vertical Adaptor */}
        {isDrive && driveFileId && driveMode === 'stream' && (
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
                backgroundColor: '#000',
                borderRadius: 0,
                objectFit: viewMode === 'fill' ? 'cover' : (viewMode === 'vertical-fit' ? 'scale-down' : 'contain'),
                '--media-captions-offset': '52px',
                '--media-cue-color': '#FFFFFF',
                '--media-cue-bg': 'rgba(10, 15, 26, 0.82)',
                '--media-cue-font-family': '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                '--media-cue-font-size': 'clamp(1.05rem, 2.2vw, 1.45rem)',
                '--media-cue-font-weight': '700',
                '--media-cue-line-height': '1.4',
                '--media-cue-padding': '6px 14px',
                '--media-cue-border-radius': '8px',
                '--media-cue-text-shadow': '0 2px 6px rgba(0,0,0,0.95), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                '--media-cue-box-shadow': '0 4px 14px rgba(0,0,0,0.5)',
              },
              '& video': {
                objectFit: viewMode === 'fill' ? 'cover' : (viewMode === 'vertical-fit' ? 'contain' : 'contain'),
              },
              /* OTT Premium Subtitle Cue Styling (Netflix / Apple TV+ style) */
              '& ::cue, & [data-part="cue"], & .vds-captions [data-part="cue"], & [data-media-captions] [data-part="cue"]': {
                color: '#FFFFFF !important',
                backgroundColor: 'rgba(10, 15, 26, 0.82) !important',
                backgroundImage: 'none !important',
                fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
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
                bottom: '52px !important',
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
              onCanPlay={() => {
                setIsAudioSwitching(false);
                // Perform seek to saved position (only for default audio or on audio switch)
                if (!initialSeekDoneRef.current && currentSecRef.current > 0) {
                  // For audio switches with server-side seeking (audioIndex > 0 with t param),
                  // the server already seeked to the position, so no client-side seek needed
                  if (selectedAudioIndex > 0) {
                    initialSeekDoneRef.current = true;
                  } else {
                    performSeek(currentSecRef.current);
                  }
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
                setStreamError('Failed to load video stream. The file may be unavailable or the format is unsupported.');
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

        {/* Case 1b: Google Drive Fallback Preview Iframe */}
        {isDrive && driveFileId && driveMode === 'iframe' && driveEmbedSrc && (
          <Box sx={{ width: '100%', height: '100%', minHeight: '560px', backgroundColor: '#000' }} key={`drive-iframe-${playerKey}`}>
            <iframe
              src={driveEmbedSrc}
              title={`${activeMovie.title} Google Drive Stream`}
              width="100%"
              height="100%"
              style={{ border: 'none', backgroundColor: '#000', width: '100%', height: '100%', minHeight: '560px' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </Box>
        )}

        {isDrive && !drivePreviewUrl && (
          <Box sx={{ p: 4, textAlign: 'center', maxWidth: 480 }}>
            <Typography variant="h6" sx={{ color: '#F87171', mb: 1, fontWeight: 700 }}>
              Invalid Google Drive Link
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              The Google Drive file ID or URL provided for this movie could not be parsed. Please check the source configuration in Manage Sources.
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
