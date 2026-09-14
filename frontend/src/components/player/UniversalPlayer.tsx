import React, { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Button,
  Chip,
  Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MovieIcon from '@mui/icons-material/Movie';
import { usePlayer } from '../../context/PlayerContext.js';
import { api } from '../../api/client.js';
import { getOttMeta, OttBadge } from '../../utils/ottProviders.js';

export const UniversalPlayer: React.FC = () => {
  const { isOpen, activeMovie, activeSource, closePlayer } = usePlayer();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Resume playback position
  useEffect(() => {
    if (isOpen && activeMovie && videoRef.current) {
      if (activeMovie.playback_position_sec && activeMovie.playback_position_sec > 0) {
        videoRef.current.currentTime = activeMovie.playback_position_sec;
      }
    }
  }, [isOpen, activeMovie]);

  // Periodic progress saving
  const handleTimeUpdate = () => {
    if (!videoRef.current || !activeMovie) return;
    const currentSec = Math.floor(videoRef.current.currentTime);
    const duration = Math.floor(videoRef.current.duration || 0);

    // Save every 15 seconds
    if (currentSec > 0 && currentSec % 15 === 0) {
      const isCompleted = duration > 0 && currentSec >= duration * 0.9;
      api.post(`/sources/movie/${activeMovie.user_movie_id}/progress`, {
        positionSec: currentSec,
        completed: isCompleted,
      }).catch(() => {});
    }
  };

  if (!activeMovie) return null;

  // Extract YouTube ID if applicable
  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&modestbranding=1` : null;
  };

  const isYouTube = activeSource?.source_type === 'youtube' || (!activeSource && activeMovie.trailer_url);
  const ytUrl = activeSource?.external_url || activeMovie.trailer_url;
  const embedUrl = ytUrl ? getYouTubeEmbedUrl(ytUrl) : null;
  const isDrive = activeSource?.source_type === 'google_drive';
  const isOtt = activeSource?.source_type === 'ott';
  const ottMeta = isOtt ? getOttMeta(activeSource.provider_name, activeSource.provider_icon) : null;

  return (
    <Dialog
      open={isOpen}
      onClose={closePlayer}
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
              icon={<MovieIcon sx={{ fontSize: '14px !important', color: '#E5A93C !important' }} />}
              label="Official Trailer"
              size="small"
              sx={{ backgroundColor: 'rgba(229, 169, 60, 0.2)', color: '#E5A93C', fontWeight: 700 }}
            />
          )}
        </Box>
        <IconButton onClick={closePlayer} sx={{ color: '#94A3B8', '&:hover': { color: '#FFF' } }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0, backgroundColor: '#000', position: 'relative', minHeight: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Case 1: Google Drive Range Streaming Video */}
        {isDrive && activeSource?.external_file_id && (
          <Box sx={{ width: '100%', height: '520px' }}>
            <video
              ref={videoRef}
              controls
              autoPlay
              onTimeUpdate={handleTimeUpdate}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              src={`/api/sources/drive/${activeSource.external_file_id}/stream`}
            >
              Your browser does not support HTML5 video playback.
            </video>
          </Box>
        )}

        {/* Case 2: YouTube Embed Player (Trailer / Video) */}
        {isYouTube && embedUrl && (
          <Box sx={{ width: '100%', height: '520px', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, py: 0.8, backgroundColor: 'rgba(229, 169, 60, 0.12)', borderBottom: '1px solid rgba(229, 169, 60, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 600 }}>
                ▶ Currently playing official trailer. To watch the full movie, launch an OTT provider or link a Drive file.
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, width: '100%', height: '100%' }}>
              <iframe
                src={embedUrl}
                title={`${activeMovie.title} Trailer`}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </Box>
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
              "{activeMovie.title}" is available for streaming on {ottMeta.name}. Deep linking opens the official portal directly.
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
              Associate a Google Drive file ID, YouTube link, or OTT subscription from the movie details page.
            </Typography>
            {activeMovie.trailer_url && (
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<PlayArrowIcon />}
                href={activeMovie.trailer_url}
                target="_blank"
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
