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
  label: string;
  language: string;
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
  const { isOpen, activeMovie, activeSource, closePlayer, openPlayer } = usePlayer();
  const queryClient = useQueryClient();

  const initialSec = activeMovie?.playback_position_sec || 0;
  const currentSecRef = useRef<number>(initialSec);
  const initialSeekDoneRef = useRef<boolean>(false);
  const [playerKey, setPlayerKey] = useState<number>(0);
  const [isEditingTime, setIsEditingTime] = useState<boolean>(false);
  const [timeInputValue, setTimeInputValue] = useState<string>('');

  // Audio track management
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [audioMenuAnchor, setAudioMenuAnchor] = useState<null | HTMLElement>(null);
  const [embeddedSubtitles, setEmbeddedSubtitles] = useState<SubtitleTrackInfo[]>([]);

  // Default to Google Drive built-in player ('iframe') for native CC subtitles & audio tracks
  const [driveMode, setDriveMode] = useState<'iframe' | 'stream'>(() => {
    try {
      const saved = localStorage.getItem('yourcinema_drive_mode');
      if (saved === 'stream' || saved === 'iframe') return saved;
    } catch {}
    return 'iframe';
  });

  const handleSetDriveMode = (mode: 'iframe' | 'stream') => {
    setDriveMode(mode);
    try {
      localStorage.setItem('yourcinema_drive_mode', mode);
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
      setAudioTracks([]);
      setSelectedAudioId('');
      setEmbeddedSubtitles([]);
    }
  }, [isOpen, activeMovie?.user_movie_id, initialSec]);

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
          if (vidstackPlayerRef.current && !initialSeekDoneRef.current) {
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
          const active = data.audioTracks.find((t: any) => t.selected) || data.audioTracks[0];
          if (active) setSelectedAudioId(active.id);
        }
        if (data?.subtitleTracks && data.subtitleTracks.length > 0) {
          setEmbeddedSubtitles(data.subtitleTracks);
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, isDrive, driveFileId]);

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

  // Synchronize audio tracks from player instance
  const syncMediaTracks = useCallback(() => {
    const player = vidstackPlayerRef.current;
    if (!player) return;

    try {
      const aTracks: any[] = Array.from(player.audioTracks || []).filter(Boolean);
      if (aTracks.length > 0) {
        const mappedAudio: AudioTrackInfo[] = aTracks.map((t: any, idx: number) => ({
          id: t?.id || `audio-${idx}`,
          label: t?.label || t?.language || `Track ${idx + 1}`,
          language: t?.language || '',
          selected: Boolean(t?.selected),
        }));
        setAudioTracks(mappedAudio);
        const active = mappedAudio.find((t) => t.selected) || mappedAudio[0];
        if (active) setSelectedAudioId(active.id);
      }
    } catch {}
  }, []);

  // Handle switching audio track
  const handleSelectAudioTrack = (trackId: string) => {
    setSelectedAudioId(trackId);
    setAudioMenuAnchor(null);
    if (driveMode === 'iframe') {
      handleSetDriveMode('stream');
    }
    const player = vidstackPlayerRef.current;
    if (player) {
      try {
        const tracks: any[] = Array.from(player.audioTracks || []).filter(Boolean);
        tracks.forEach((t: any, idx: number) => {
          if (!t) return;
          const id = t.id || `audio-${idx}`;
          t.selected = id === trackId;
        });
      } catch {}
      setTimeout(syncMediaTracks, 60);
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

    setIsEditingTime(false);
    setAudioMenuAnchor(null);
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

  const activeAudioLabel =
    audioTracks.find((t) => t.id === selectedAudioId)?.label ||
    (audioTracks.length > 0 ? audioTracks[0].label : 'Default Audio');

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#07090E',
          border: '1px solid rgba(255,255,255,0.15)',
          overflow: 'hidden',
          borderRadius: 3,
        },
      }}
    >
      {/* Modal Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
            {activeMovie.title}
          </Typography>
          {isOtt && activeSource && (
            <OttBadge providerName={activeSource.provider_name} providerIcon={activeSource.provider_icon} size="small" />
          )}
          {isDrive && (
            <Chip
              label={driveMode === 'iframe' ? 'Google Drive Player' : 'Vidstack HD Stream'}
              size="small"
              sx={{
                backgroundColor: driveMode === 'iframe' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: driveMode === 'iframe' ? '#34D399' : '#38BDF8',
                fontWeight: 700,
              }}
            />
          )}
          {isYouTube && (
            <Chip
              icon={<MovieIcon sx={{ fontSize: '14px !important', color: '#EF4444 !important' }} />}
              label={activeSource?.source_type === 'youtube' ? 'YouTube Movie' : 'YouTube Player'}
              size="small"
              sx={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#F87171', fontWeight: 700 }}
            />
          )}
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{
            color: '#94A3B8',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            '&:hover': { color: '#FFF', backgroundColor: 'rgba(255, 255, 255, 0.15)' },
            p: 1,
          }}
          aria-label="Close"
        >
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Single Status & Action Bar */}
      {(isDrive || isYouTube) && (
        <Box
          sx={{
            px: 2,
            py: 1,
            backgroundColor: isDrive
              ? (driveMode === 'iframe' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(56, 189, 248, 0.08)')
              : 'rgba(239, 68, 68, 0.12)',
            borderBottom: `1px solid ${
              isDrive
                ? (driveMode === 'iframe' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)')
                : 'rgba(239, 68, 68, 0.25)'
            }`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography
              variant="caption"
              sx={{
                color: isDrive
                  ? (driveMode === 'iframe' ? '#34D399' : '#38BDF8')
                  : '#F87171',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              ▶ {isDrive
                ? (driveMode === 'iframe' ? 'Google Drive Player (Default CC Subtitles & Audio)' : 'Vidstack Direct Stream')
                : (activeSource?.source_type === 'youtube' ? 'YouTube Stream' : 'Official Trailer')}
            </Typography>

            <Chip
              label={initialSec > 0 ? `Resumed at ${formatPlaybackTime(initialSec)}` : 'Playing from start'}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 700,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#E2E8F0',
              }}
            />

            {isDrive && driveMode === 'stream' && (
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
                        width: 100,
                        '& .MuiInputBase-input': { py: 0.3, px: 1, fontSize: '11px', color: '#FFF' },
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          '& fieldset': { borderColor: 'rgba(56, 189, 248, 0.6)' },
                        },
                      }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSaveTimeInput}
                      sx={{ minWidth: 'auto', py: 0.2, px: 1.2, fontSize: '11px', backgroundColor: '#0284C7', textTransform: 'none', fontWeight: 700 }}
                    >
                      Save
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setIsEditingTime(false)}
                      sx={{ minWidth: 'auto', py: 0.2, px: 0.8, fontSize: '11px', color: '#94A3B8', textTransform: 'none' }}
                    >
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <Tooltip title="Save or adjust playback timestamp">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        const cur = vidstackPlayerRef.current?.currentTime || currentSecRef.current;
                        setTimeInputValue(cur > 0 ? formatPlaybackTime(cur) : '');
                        setIsEditingTime(true);
                      }}
                      startIcon={<BookmarkIcon sx={{ fontSize: '13px !important', color: '#38BDF8' }} />}
                      sx={{
                        borderColor: 'rgba(56, 189, 248, 0.4)',
                        color: '#E2E8F0',
                        fontSize: '11px',
                        fontWeight: 600,
                        py: 0.2,
                        px: 1.2,
                        textTransform: 'none',
                        '&:hover': { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.1)' },
                      }}
                    >
                      Set Spot
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
          </Box>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            {/* Audio Track Switcher for Drive movies */}
            {isDrive && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => setAudioMenuAnchor(e.currentTarget)}
                  startIcon={<VolumeUpIcon sx={{ fontSize: '14px !important', color: '#38BDF8' }} />}
                  endIcon={<ArrowDropDownIcon sx={{ fontSize: '14px !important' }} />}
                  sx={{
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    color: '#E2E8F0',
                    fontSize: '11px',
                    fontWeight: 600,
                    py: 0.2,
                    px: 1.2,
                    textTransform: 'none',
                    '&:hover': { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.1)' },
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
                      backgroundColor: '#0F172A',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      color: '#FFF',
                      minWidth: 170,
                    },
                  }}
                >
                  {audioTracks.length > 0 ? (
                    audioTracks.map((track) => {
                      const isSelected = track.id === selectedAudioId || (!selectedAudioId && track.selected);
                      return (
                        <MenuItem
                          key={track.id}
                          selected={isSelected}
                          onClick={() => handleSelectAudioTrack(track.id)}
                          sx={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', py: 1 }}
                        >
                          <Typography variant="body2" sx={{ fontSize: '12px', color: isSelected ? '#38BDF8' : '#F8FAFC', fontWeight: isSelected ? 700 : 500 }}>
                            {track.label || track.language || 'Audio Track'}
                          </Typography>
                          {isSelected && <CheckIcon sx={{ fontSize: 15, color: '#38BDF8', ml: 1.5 }} />}
                        </MenuItem>
                      );
                    })
                  ) : (
                    <MenuItem disabled sx={{ fontSize: '12px', color: '#94A3B8' }}>
                      Default / Stereo Track
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}

            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleStartOver}
              startIcon={<RestartAltIcon sx={{ fontSize: '14px !important' }} />}
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.25)',
                color: '#F8FAFC',
                fontSize: '11px',
                fontWeight: 600,
                py: 0.2,
                px: 1.2,
                textTransform: 'none',
                '&:hover': { borderColor: 'rgba(255, 255, 255, 0.5)' },
              }}
            >
              Start Over
            </Button>

            <Tooltip title="Mark movie as watched & completed">
              <Button
                size="small"
                variant="text"
                onClick={handleMarkFinished}
                startIcon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#10B981' }} />}
                sx={{
                  color: '#10B981',
                  fontSize: '11px',
                  py: 0.2,
                  px: 1,
                  textTransform: 'none',
                }}
              >
                Mark Finished
              </Button>
            </Tooltip>

            {isDrive && driveFileId && (
              <ButtonGroup size="small" variant="outlined" sx={{ backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 1.5 }}>
                <Tooltip title="Google Drive Built-in Player (Supports embedded CC subtitles, audio & quality switcher)">
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
                      '&:hover': {
                        backgroundColor: driveMode === 'iframe' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255,255,255,0.06)',
                        color: '#FFF',
                      },
                    }}
                  >
                    Drive Player (CC & Audio)
                  </Button>
                </Tooltip>
                <Tooltip title="Direct HTML5 Stream Player">
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
                      '&:hover': {
                        backgroundColor: driveMode === 'stream' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(255,255,255,0.06)',
                        color: '#FFF',
                      },
                    }}
                  >
                    Direct Stream
                  </Button>
                </Tooltip>
              </ButtonGroup>
            )}

            {isDrive && driveViewUrl && (
              <Button
                size="small"
                variant="text"
                component="a"
                href={driveViewUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                sx={{ color: '#38BDF8', fontSize: '11px', textTransform: 'none', py: 0.2, px: 1 }}
              >
                Open in Drive
              </Button>
            )}

            {isYouTube && ytRawUrl && (
              <Button
                size="small"
                variant="text"
                component="a"
                href={ytRawUrl}
                target="_blank"
                rel="noopener noreferrer"
                endIcon={<OpenInNewIcon sx={{ fontSize: '13px !important' }} />}
                sx={{ color: '#F87171', fontSize: '11px', textTransform: 'none', py: 0.2, px: 1 }}
              >
                Open on YouTube
              </Button>
            )}
          </Stack>
        </Box>
      )}

      <DialogContent sx={{ p: 0, backgroundColor: '#000', position: 'relative', minHeight: '520px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Case 1a: Vidstack Modern Video Player for Google Drive with Subtitles, Audio Tracks & Resume */}
        {isDrive && driveFileId && driveMode === 'stream' && (
          <Box
            sx={{
              width: '100%',
              height: '560px',
              backgroundColor: '#000',
              position: 'relative',
              '& [data-media-player]': {
                width: '100%',
                height: '100%',
                backgroundColor: '#000',
                borderRadius: 0,
              },
            }}
            key={`vidstack-stream-${playerKey}-${activeMovie.user_movie_id}`}
          >
            <MediaPlayer
              ref={vidstackPlayerRef}
              title={activeMovie.title}
              src={`/api/sources/drive/${driveFileId}/stream`}
              storage={`yourcinema_playback_${activeMovie.user_movie_id}`}
              autoPlay
              playsInline
              onCanPlay={() => {
                if (!initialSeekDoneRef.current && initialSec > 0 && vidstackPlayerRef.current) {
                  try {
                    vidstackPlayerRef.current.currentTime = initialSec;
                    initialSeekDoneRef.current = true;
                  } catch {}
                }
                syncMediaTracks();
              }}
              onAudioTracksChange={syncMediaTracks}
              onTimeUpdate={(detail) => {
                const cur = Math.floor(detail.currentTime);
                currentSecRef.current = cur;
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
            >
              <MediaProvider>
                {embeddedSubtitles.map((sub) => (
                  <Track
                    key={sub.id}
                    src={sub.src}
                    kind="subtitles"
                    label={sub.label}
                    lang={sub.language}
                    type="vtt"
                    default={sub.default}
                  />
                ))}
              </MediaProvider>
              <DefaultVideoLayout icons={defaultLayoutIcons} />
            </MediaPlayer>
          </Box>
        )}

        {/* Case 1b: Google Drive Fallback Preview Iframe */}
        {isDrive && driveFileId && driveMode === 'iframe' && driveEmbedSrc && (
          <Box sx={{ width: '100%', height: '540px', backgroundColor: '#000' }} key={`drive-iframe-${playerKey}`}>
            <iframe
              src={driveEmbedSrc}
              title={`${activeMovie.title} Google Drive Stream`}
              width="100%"
              height="100%"
              style={{ border: 'none', backgroundColor: '#000' }}
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
          <Box sx={{ width: '100%', height: '540px', backgroundColor: '#000', position: 'relative' }} key={`yt-player-${playerKey}-${ytId}`}>
            <iframe
              id={ytContainerId}
              src={ytEmbedUrl || `https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&playsinline=1`}
              title={`${activeMovie.title} YouTube Player`}
              width="100%"
              height="100%"
              style={{ border: 'none', backgroundColor: '#000', width: '100%', height: '100%' }}
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
