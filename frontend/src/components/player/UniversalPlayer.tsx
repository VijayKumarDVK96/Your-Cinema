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
  Slider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MovieIcon from '@mui/icons-material/Movie';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useQueryClient } from '@tanstack/react-query';
import { usePlayer } from '../../context/PlayerContext.js';
import { api } from '../../api/client.js';
import { getOttMeta, OttBadge } from '../../utils/ottProviders.js';
import { extractDriveFileId, getDrivePreviewUrl, getDriveViewUrl } from '../../utils/googleDrive.js';
import { extractYouTubeId, getYouTubeEmbedUrl, isYouTubeSource } from '../../utils/youtube.js';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
    webkitAudioContext: typeof AudioContext;
  }
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
  const [currentSec, setCurrentSec] = useState<number>(initialSec);
  const currentSecRef = useRef<number>(initialSec);
  const [playerKey, setPlayerKey] = useState<number>(0);
  const [isEditingTime, setIsEditingTime] = useState<boolean>(false);
  const [timeInputValue, setTimeInputValue] = useState<string>('');
  
  // Default to 'stream' (Direct HTML5) so video resumes playback automatically at the exact saved position
  const [driveMode, setDriveMode] = useState<'stream' | 'iframe'>(() => {
    try {
      const saved = localStorage.getItem('yourcinema_drive_mode');
      if (saved === 'stream' || saved === 'iframe') return saved;
    } catch {}
    return 'stream';
  });

  const [audioBoost, setAudioBoost] = useState<number>(100);
  const [showBoostMenu, setShowBoostMenu] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const mediaSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const handleSetDriveMode = (mode: 'stream' | 'iframe') => {
    setDriveMode(mode);
    try {
      localStorage.setItem('yourcinema_drive_mode', mode);
    } catch {}
  };

  const handleApplyAudioGain = (gainPercent: number) => {
    try {
      if (!videoRef.current) return;
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
          gainNodeRef.current = audioCtxRef.current.createGain();
          mediaSourceNodeRef.current = audioCtxRef.current.createMediaElementSource(videoRef.current);
          mediaSourceNodeRef.current.connect(gainNodeRef.current);
          gainNodeRef.current.connect(audioCtxRef.current.destination);
        }
      }
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.value = gainPercent / 100;
      }
      setAudioBoost(gainPercent);
    } catch (e) {
      // AudioContext connection might fail if user hasn't interacted or cross-origin restrictions apply
    }
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  const runtimeSec = Math.max((activeMovie?.runtime || 120) * 60, 600);

  // Fetch latest exact progress from database on mount / movie open
  useEffect(() => {
    if (!isOpen || !activeMovie?.user_movie_id) return;
    let isSubscribed = true;

    api.get(`/sources/movie/${activeMovie.user_movie_id}/progress`)
      .then((res) => {
        if (!isSubscribed) return;
        const p = res.data?.data?.last_played_position_sec;
        if (typeof p === 'number' && p > 0) {
          setCurrentSec(p);
          currentSecRef.current = p;
          if (videoRef.current && Math.abs(videoRef.current.currentTime - p) > 3) {
            videoRef.current.currentTime = p;
          }
          if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
            ytPlayerRef.current.seekTo(p, true);
          }
        }
      })
      .catch(() => {});

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, activeMovie?.user_movie_id]);

  const isDrive = activeSource?.source_type === 'google_drive';
  const isYouTube =
    activeSource?.source_type === 'youtube' ||
    isYouTubeSource(activeSource) ||
    (!activeSource && Boolean(activeMovie?.trailer_url));
  const isOtt = activeSource?.source_type === 'ott' && !isYouTube;
  const ottMeta = isOtt && activeSource ? getOttMeta(activeSource.provider_name, activeSource.provider_icon) : null;

  // Google Drive URLs
  const driveFileId = isDrive
    ? extractDriveFileId(activeSource?.external_file_id || activeSource?.external_url)
    : '';
  const drivePreviewUrl = driveFileId ? getDrivePreviewUrl(driveFileId) : null;
  const driveEmbedSrc = drivePreviewUrl ? `${drivePreviewUrl}?autoplay=1` : '';
  const driveViewUrl = driveFileId ? getDriveViewUrl(driveFileId) : null;

  // Robust seek effect to resume HTML5 video at the exact saved position
  useEffect(() => {
    if (!isOpen || !isDrive || driveMode !== 'stream') return;
    const target = currentSecRef.current || initialSec;
    if (target > 0) {
      const timers = [150, 400, 800, 1500].map((delay) =>
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 1) {
            try {
              if (Math.abs(videoRef.current.currentTime - target) > 2) {
                videoRef.current.currentTime = target;
              }
            } catch (e) {}
          }
        }, delay)
      );
      return () => {
        timers.forEach(clearTimeout);
      };
    }
  }, [isOpen, isDrive, driveMode, activeMovie?.user_movie_id, playerKey]);

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

  // Mount YouTube IFrame API Player for accurate forward/rewind scrubbing tracking
  const ytRawUrl = activeSource?.external_url || activeMovie?.trailer_url || '';
  const ytId = extractYouTubeId(ytRawUrl);
  const ytEmbedUrl = ytId ? getYouTubeEmbedUrl(ytId, initialSec) : null;
  const ytContainerId = activeMovie ? `yt-embed-player-${activeMovie.user_movie_id}` : 'yt-embed-player';

  useEffect(() => {
    if (!isOpen || !isYouTube || !ytId) return;

    let isSubscribed = true;
    let checkInterval: any = null;

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
          videoId: ytId,
          playerVars: {
            autoplay: 1,
            start: Math.floor(initialSec),
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0,
          },
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
                  setCurrentSec(Math.floor(cur));
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
      const t = setTimeout(initYt, 80);
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
      }, 200);

      const timeout = setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
      }, 4000);

      return () => {
        isSubscribed = false;
        if (checkInterval) clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, [isOpen, isYouTube, ytId, ytContainerId, playerKey]);

  // Periodic timer for YouTube iframe API real-time tracking
  useEffect(() => {
    if (!isOpen || !activeMovie) return;

    const pollTimer = setInterval(() => {
      if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          if (typeof t === 'number' && !isNaN(t) && t >= 0) {
            setCurrentSec(Math.floor(t));
            currentSecRef.current = Math.floor(t);
          }
        } catch (e) {}
      } else if (isDrive && videoRef.current && !isNaN(videoRef.current.currentTime)) {
        const t = Math.floor(videoRef.current.currentTime);
        if (t >= 0 && t !== currentSecRef.current) {
          setCurrentSec(t);
          currentSecRef.current = t;
        }
      }
    }, 1000);

    const saveTimer = setInterval(() => {
      if (currentSecRef.current > 0) {
        saveProgress(currentSecRef.current, false);
      }
    }, 5000);

    return () => {
      clearInterval(pollTimer);
      clearInterval(saveTimer);
    };
  }, [isOpen, activeMovie, isDrive, isYouTube, saveProgress]);

  if (!isOpen || !activeMovie) return null;

  // Handle closing player and persisting latest position
  const handleClose = () => {
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
      try {
        const t = ytPlayerRef.current.getCurrentTime();
        if (typeof t === 'number' && !isNaN(t) && t >= 0) {
          saveProgress(Math.floor(t), false);
        }
      } catch (e) {}
    } else if (isDrive && videoRef.current && !isNaN(videoRef.current.currentTime) && videoRef.current.currentTime > 0) {
      saveProgress(Math.floor(videoRef.current.currentTime), false);
    } else if (currentSecRef.current > 0) {
      saveProgress(currentSecRef.current, false);
    }

    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.destroy();
      } catch (e) {}
      ytPlayerRef.current = null;
    }
    setIsEditingTime(false);
    closePlayer();
  };

  // Save manual timestamp input for Google Drive
  const handleSaveTimeInput = () => {
    const parsed = parsePlaybackInput(timeInputValue);
    if (parsed !== null && parsed >= 0) {
      setCurrentSec(parsed);
      currentSecRef.current = parsed;
      saveProgress(parsed, false);
      if (videoRef.current) {
        videoRef.current.currentTime = parsed;
      }
      setIsEditingTime(false);
    }
  };

  // Start Over handler
  const handleStartOver = () => {
    setCurrentSec(0);
    currentSecRef.current = 0;
    saveProgress(0, false);
    setIsEditingTime(false);
    if (isYouTube && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
      } catch (e) {}
    } else if (isDrive && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    } else {
      setPlayerKey((k) => k + 1);
    }
  };

  // Mark Finished handler
  const handleMarkFinished = () => {
    setCurrentSec(runtimeSec);
    currentSecRef.current = runtimeSec;
    saveProgress(runtimeSec, true);
  };

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
              label="Google Drive Stream"
              size="small"
              sx={{ backgroundColor: 'rgba(15, 157, 88, 0.2)', color: '#0F9D58', fontWeight: 700 }}
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
        <IconButton onClick={handleClose} sx={{ color: '#94A3B8', '&:hover': { color: '#FFF' } }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Clean Single Status & Action Bar (Zero Duplicate Controls) */}
      {(isDrive || isYouTube) && (
        <Box
          sx={{
            px: 2,
            py: 1,
            backgroundColor: isDrive ? 'rgba(15, 157, 88, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            borderBottom: `1px solid ${isDrive ? 'rgba(15, 157, 88, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
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
                color: isDrive ? '#0F9D58' : '#F87171',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              ▶ {isDrive ? 'Google Drive Stream' : (activeSource?.source_type === 'youtube' ? 'YouTube Stream' : 'Official Trailer')}
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

            {isYouTube && (
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Position: <span style={{ color: '#38BDF8', fontWeight: 700 }}>{formatPlaybackTime(currentSec)}</span> / {formatPlaybackTime(runtimeSec)}
              </Typography>
            )}

            {isDrive && (
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
                          '& fieldset': { borderColor: 'rgba(15, 157, 88, 0.6)' },
                        },
                      }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSaveTimeInput}
                      sx={{ minWidth: 'auto', py: 0.2, px: 1.2, fontSize: '11px', backgroundColor: '#0F9D58', textTransform: 'none', fontWeight: 700 }}
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
                  <Tooltip title="Save your stopping point so you can resume next time">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setTimeInputValue(currentSec > 0 ? formatPlaybackTime(currentSec) : '');
                        setIsEditingTime(true);
                      }}
                      startIcon={<BookmarkIcon sx={{ fontSize: '13px !important', color: '#0F9D58' }} />}
                      sx={{
                        borderColor: 'rgba(15, 157, 88, 0.4)',
                        color: '#E2E8F0',
                        fontSize: '11px',
                        fontWeight: 600,
                        py: 0.2,
                        px: 1.2,
                        textTransform: 'none',
                        '&:hover': { borderColor: '#0F9D58', backgroundColor: 'rgba(15, 157, 88, 0.1)' },
                      }}
                    >
                      {currentSec > 0 ? `Saved Spot: ${formatPlaybackTime(currentSec)}` : 'Save Spot'}
                    </Button>
                  </Tooltip>
                )}
              </>
            )}
          </Box>

          {/* Quick Actions (No Duplicate Sliders or Buttons) */}
          <Stack direction="row" spacing={1} alignItems="center">
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
                <Tooltip title="Uses Google Drive cloud-transcoding (plays AC3/EAC3/MKV audio with audible stereo sound)">
                  <Button
                    onClick={() => handleSetDriveMode('iframe')}
                    startIcon={<VolumeUpIcon sx={{ fontSize: '13px !important' }} />}
                    sx={{
                      fontSize: '11px',
                      textTransform: 'none',
                      fontWeight: driveMode === 'iframe' ? 700 : 500,
                      backgroundColor: driveMode === 'iframe' ? 'rgba(15, 157, 88, 0.25)' : 'transparent',
                      color: driveMode === 'iframe' ? '#34D399' : '#94A3B8',
                      borderColor: driveMode === 'iframe' ? '#059669' : 'rgba(255,255,255,0.15)',
                      '&:hover': {
                        backgroundColor: driveMode === 'iframe' ? 'rgba(15, 157, 88, 0.35)' : 'rgba(255,255,255,0.06)',
                        color: '#FFF',
                      },
                    }}
                  >
                    Drive Preview (Audio)
                  </Button>
                </Tooltip>
                <Tooltip title="Direct HTML5 raw video stream (supports range seek, but AC3 audio may be silent in browser)">
                  <Button
                    onClick={() => handleSetDriveMode('stream')}
                    startIcon={<GraphicEqIcon sx={{ fontSize: '13px !important' }} />}
                    sx={{
                      fontSize: '11px',
                      textTransform: 'none',
                      fontWeight: driveMode === 'stream' ? 700 : 500,
                      backgroundColor: driveMode === 'stream' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                      color: driveMode === 'stream' ? '#38BDF8' : '#94A3B8',
                      borderColor: driveMode === 'stream' ? '#0284C7' : 'rgba(255,255,255,0.15)',
                      '&:hover': {
                        backgroundColor: driveMode === 'stream' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(255,255,255,0.06)',
                        color: '#FFF',
                      },
                    }}
                  >
                    Direct Stream
                  </Button>
                </Tooltip>
              </ButtonGroup>
            )}

            {isDrive && driveMode === 'stream' && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title="Boost HTML5 audio volume">
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      const next = audioBoost === 100 ? 150 : audioBoost === 150 ? 200 : audioBoost === 200 ? 300 : 100;
                      handleApplyAudioGain(next);
                    }}
                    startIcon={<VolumeUpIcon sx={{ fontSize: '13px !important', color: audioBoost > 100 ? '#F59E0B' : '#94A3B8' }} />}
                    sx={{
                      fontSize: '11px',
                      color: audioBoost > 100 ? '#F59E0B' : '#94A3B8',
                      textTransform: 'none',
                      py: 0.2,
                      px: 0.8,
                    }}
                  >
                    Boost {audioBoost}%
                  </Button>
                </Tooltip>
              </Box>
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
                sx={{ color: '#0F9D58', fontSize: '11px', textTransform: 'none', py: 0.2, px: 1 }}
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

      {/* Audio Helper Banner for Direct Stream */}
      {isDrive && driveFileId && driveMode === 'stream' && (
        <Box
          sx={{
            px: 2,
            py: 0.8,
            backgroundColor: 'rgba(234, 179, 8, 0.12)',
            borderBottom: '1px solid rgba(234, 179, 8, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VolumeOffIcon sx={{ fontSize: 16, color: '#FBBF24' }} />
            <Typography variant="caption" sx={{ color: '#FDE047', fontWeight: 500 }}>
              Audio not audible? Browsers cannot decode MKV/AC3 multi-channel audio directly. Switch to Drive Preview for cloud-transcoded sound.
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            onClick={() => handleSetDriveMode('iframe')}
            startIcon={<VolumeUpIcon sx={{ fontSize: '13px !important' }} />}
            sx={{
              backgroundColor: '#D97706',
              color: '#FFF',
              fontSize: '11px',
              py: 0.2,
              px: 1.2,
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { backgroundColor: '#B45309' },
            }}
          >
            Switch to Drive Preview (with Audio)
          </Button>
        </Box>
      )}

      <DialogContent sx={{ p: 0, backgroundColor: '#000', position: 'relative', minHeight: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Case 1a: Google Drive Direct Video Stream with Range Seeking & Resume */}
        {isDrive && driveFileId && driveMode === 'stream' && (
          <Box sx={{ width: '100%', height: '540px', backgroundColor: '#000', position: 'relative' }} key={`drive-stream-${playerKey}`}>
            <video
              ref={videoRef}
              src={`/api/sources/drive/${driveFileId}/stream`}
              controls
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#000',
              }}
              onLoadedMetadata={() => {
                const target = currentSecRef.current || initialSec;
                if (target > 0 && videoRef.current) {
                  try {
                    videoRef.current.currentTime = target;
                  } catch (e) {}
                }
              }}
              onCanPlay={() => {
                const target = currentSecRef.current || initialSec;
                if (target > 0 && videoRef.current && Math.abs(videoRef.current.currentTime - target) > 1.5) {
                  try {
                    videoRef.current.currentTime = target;
                  } catch (e) {}
                }
              }}
              onPlay={() => {
                const target = currentSecRef.current || initialSec;
                if (target > 0 && videoRef.current && Math.abs(videoRef.current.currentTime - target) > 1.5) {
                  try {
                    videoRef.current.currentTime = target;
                  } catch (e) {}
                }
              }}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  const cur = Math.floor(videoRef.current.currentTime);
                  if (cur !== currentSecRef.current) {
                    currentSecRef.current = cur;
                    setCurrentSec(cur);
                  }
                }
              }}
              onPause={() => {
                if (videoRef.current) {
                  saveProgress(Math.floor(videoRef.current.currentTime), false);
                }
              }}
              onEnded={() => {
                saveProgress(runtimeSec, true);
              }}
              onError={() => {
                handleSetDriveMode('iframe');
              }}
            />
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
          <Box sx={{ width: '100%', height: '540px', position: 'relative' }}>
            {/* Dynamic YouTube container mounted by API */}
            <div
              id={ytContainerId}
              style={{ width: '100%', height: '100%' }}
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
