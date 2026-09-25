import React from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import StarIcon from '@mui/icons-material/Star';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import AddIcon from '@mui/icons-material/Add';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import { UserMovie, MovieSource } from '../../../types/index.js';
import { OttBadge, getOttMeta } from '../../../utils/ottProviders.js';
import { isYouTubeSource } from '../../../utils/youtube.js';
import { StatusChip } from '../../../components/ui/index.js';

export interface MovieHeroProps {
  movie: UserMovie;
  posterUrl: string;
  backdropUrl: string | null;
  ottSources: MovieSource[];
  isResumable: boolean;
  onPlay: () => void;
  onStartOver: () => void;
  onWatchTrailer: () => void;
  onToggleStatus: () => void;
  onToggleFavorite: () => void;
  onOpenRating: () => void;
  onOpenEdit: () => void;
  onOpenRefresh: () => void;
  onOpenDelete: () => void;
  onOpenFullscreenBackdrop: () => void;
  onOpenGenreDialog: () => void;
  onDetachGenre: (genreId: string | number) => void;
  formatRuntime: (mins: number) => string;
}

export const MovieHero: React.FC<MovieHeroProps> = ({
  movie,
  posterUrl,
  backdropUrl,
  ottSources,
  isResumable,
  onPlay,
  onStartOver,
  onWatchTrailer,
  onToggleStatus,
  onToggleFavorite,
  onOpenRating,
  onOpenEdit,
  onOpenRefresh,
  onOpenDelete,
  onOpenFullscreenBackdrop,
  onOpenGenreDialog,
  onDetachGenre,
  formatRuntime,
}) => {
  const resolveOttUrl = (src: any): string => {
    const raw = src?.external_url || '';
    if (raw && raw.includes('themoviedb.org')) {
      return getOttMeta(src.provider_name, src.provider_icon).getDefaultSearchUrl(movie.title);
    }
    return raw || getOttMeta(src.provider_name, src.provider_icon).getDefaultSearchUrl(movie.title);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: 3.5,
        overflow: 'hidden',
        backgroundColor: '#0A0E18',
        minHeight: { xs: '420px', sm: '480px', md: '560px', lg: '600px' },
        display: 'flex',
        alignItems: 'flex-end',
        p: { xs: 2.5, sm: 3.5, md: 4.5 },
        backgroundImage: backdropUrl
          ? `linear-gradient(to top, #07090E 0%, rgba(7, 9, 14, 0.75) 26%, rgba(7, 9, 14, 0.15) 55%, transparent 100%), linear-gradient(to right, rgba(7, 9, 14, 0.8) 0%, rgba(7, 9, 14, 0.25) 45%, transparent 80%), url(${backdropUrl})`
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center 20%',
        backgroundRepeat: 'no-repeat',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
      }}
    >
      {/* Full Image Lightbox Button */}
      {backdropUrl && (
        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
          <Tooltip title="View Full High-Resolution Backdrop">
            <Button
              size="small"
              variant="contained"
              startIcon={<FullscreenIcon />}
              onClick={onOpenFullscreenBackdrop}
              sx={{
                backgroundColor: 'rgba(7, 9, 14, 0.75)',
                backdropFilter: 'blur(12px)',
                color: '#F8FAFC',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'none',
                px: 1.5,
                py: 0.6,
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                '&:hover': {
                  backgroundColor: 'rgba(229, 169, 60, 0.25)',
                  borderColor: '#E5A93C',
                  color: '#E5A93C',
                },
              }}
            >
              Full Image
            </Button>
          </Tooltip>
        </Box>
      )}

      <Grid container spacing={{ xs: 2.5, md: 4 }} alignItems="flex-end">
        {/* Poster Column */}
        <Grid item xs={12} sm={4} md={3} lg={2.6}>
          <Box
            component="img"
            src={posterUrl}
            alt={movie.title}
            sx={{
              width: '100%',
              maxWidth: { xs: 200, sm: '100%' },
              maxHeight: { xs: 290, sm: 360, md: 420 },
              objectFit: 'cover',
              borderRadius: 2.5,
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          />
        </Grid>

        {/* Details Column */}
        <Grid item xs={12} sm={8} md={9} lg={9.4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Badges */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              {movie.media_type === 'tv' && (
                <Chip
                  icon={<LiveTvIcon sx={{ fontSize: '14px !important', color: '#FFFFFF !important' }} />}
                  label="WEB SERIES"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(124, 58, 237, 0.9)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    letterSpacing: '0.05em',
                    border: '1px solid rgba(167, 139, 250, 0.5)',
                    boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)',
                  }}
                />
              )}
              <StatusChip status={movie.watch_status} />
              {movie.is_customized && (
                <Chip
                  label="Custom Edited"
                  size="small"
                  sx={{ backgroundColor: 'rgba(229, 169, 60, 0.2)', color: '#E5A93C', fontWeight: 600 }}
                />
              )}
              {/* Linked OTT Badges */}
              {ottSources.map((s) => (
                <OttBadge
                  key={s.id}
                  providerName={s.provider_name}
                  providerIcon={s.provider_icon}
                  size="medium"
                  interactive
                  onClick={() => {
                    if (isYouTubeSource(s)) {
                      onPlay();
                    } else {
                      window.open(resolveOttUrl(s), '_blank', 'noopener,noreferrer');
                    }
                  }}
                />
              ))}
            </Box>

            <Typography variant="h3" sx={{ fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1, fontSize: { xs: '1.8rem', sm: '2.4rem', md: '3rem' } }}>
              {movie.title}
            </Typography>

            <Typography variant="body1" sx={{ color: '#94A3B8', fontWeight: 500, fontSize: { xs: '0.88rem', sm: '1rem' } }}>
              {movie.media_type === 'tv'
                ? `${movie.first_air_date ? movie.first_air_date.substring(0, 4) : (movie.release_date?.substring(0, 4) || 'TBD')}${movie.last_air_date && movie.last_air_date.substring(0, 4) !== (movie.first_air_date || movie.release_date || '').substring(0, 4) ? `–${movie.last_air_date.substring(0, 4)}` : ''} • ${movie.number_of_seasons || 1} ${movie.number_of_seasons === 1 ? 'Season' : 'Seasons'}${movie.number_of_episodes ? ` • ${movie.number_of_episodes} Episodes` : ''} • ${movie.created_by && movie.created_by.length > 0 ? `Created by ${movie.created_by.map((c: any) => c.name).join(', ')}` : (movie.director ? `Directed by ${movie.director}` : '')}`
                : `${movie.release_date?.substring(0, 4)} • ${movie.runtime ? formatRuntime(movie.runtime) : 'Runtime TBD'} • Directed by ${movie.director || 'Unknown'}`}
            </Typography>

            {/* Ratings */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, my: 0.5, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StarIcon sx={{ color: '#E5A93C', fontSize: 24 }} />
                <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                  {movie.personal_rating != null && !isNaN(Number(movie.personal_rating))
                    ? `${Number(movie.personal_rating).toFixed(1)} / 5.0`
                    : 'Not Rated'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B' }}>Personal</Typography>
              </Box>

              {movie.vote_average && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>
                    TMDB: <span style={{ color: '#CBD5E1', fontWeight: 600 }}>{Number(movie.vote_average).toFixed(1)}/10</span>
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Genre Chips */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.8 }}>
              {(() => {
                const activeCustom = (movie.custom_genres || [])[0];
                if (activeCustom) {
                  return (
                    <Chip
                      key={activeCustom.id}
                      icon={<AutoAwesomeIcon sx={{ fontSize: '13px !important', color: `${activeCustom.color || '#38BDF8'} !important` }} />}
                      label={activeCustom.name}
                      size="small"
                      onDelete={() => onDetachGenre(activeCustom.id)}
                      sx={{
                        backgroundColor: `${activeCustom.color || '#38BDF8'}22`,
                        color: activeCustom.color || '#38BDF8',
                        border: `1px solid ${activeCustom.color || '#38BDF8'}55`,
                        fontWeight: 600,
                      }}
                    />
                  );
                }
                const activePredefined = (movie.genres || [])[0];
                if (activePredefined) {
                  return (
                    <Chip
                      key={activePredefined.id}
                      label={activePredefined.name}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: '#E2E8F0',
                        fontWeight: 600,
                      }}
                    />
                  );
                }
                return (
                  <Chip
                    label="Unassigned Genre"
                    size="small"
                    sx={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#64748B' }}
                  />
                );
              })()}

              <Button
                size="small"
                variant="text"
                startIcon={<AddIcon sx={{ fontSize: '14px !important' }} />}
                onClick={onOpenGenreDialog}
                sx={{
                  color: '#38BDF8',
                  fontSize: '0.75rem',
                  py: 0.2,
                  px: 1,
                  minWidth: 'auto',
                  border: '1px dashed rgba(56, 189, 248, 0.4)',
                  borderRadius: 1.5,
                  '&:hover': { backgroundColor: 'rgba(56, 189, 248, 0.1)' },
                }}
              >
                Change Genre
              </Button>
            </Box>

            {/* Main Action Buttons */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mt: 1 }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={onPlay}
                sx={{ fontWeight: 700, px: 3, py: 1 }}
              >
                {isResumable ? 'Resume Playback' : 'Stream / Play Movie'}
              </Button>

              {isResumable && (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<RestartAltIcon />}
                  onClick={onStartOver}
                  sx={{ color: '#F8FAFC', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  Start Over
                </Button>
              )}

              {movie.trailer_url && (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<PlayArrowIcon />}
                  onClick={onWatchTrailer}
                  sx={{ color: '#F8FAFC', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  Watch Trailer
                </Button>
              )}

              <Button
                variant={movie.watch_status === 'watched' ? 'contained' : 'outlined'}
                color={movie.watch_status === 'watched' ? 'success' : 'inherit'}
                startIcon={<CheckCircleIcon />}
                onClick={onToggleStatus}
                sx={{ color: movie.watch_status === 'watched' ? '#FFFFFF' : '#F8FAFC' }}
              >
                {movie.watch_status === 'watched' ? 'Watched' : 'Mark Watched'}
              </Button>

              <Button
                variant="outlined"
                color="primary"
                startIcon={<StarIcon />}
                onClick={onOpenRating}
              >
                Rate & Log
              </Button>

              {/* Icon Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Tooltip title={movie.is_favorite ? 'Remove Favorite' : 'Mark Favorite'}>
                  <IconButton
                    onClick={onToggleFavorite}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: movie.is_favorite ? '#EF4444' : '#94A3B8',
                      '&:hover': { color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                    }}
                  >
                    {movie.is_favorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Edit Metadata">
                  <IconButton
                    onClick={onOpenEdit}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#94A3B8',
                      '&:hover': { color: '#E5A93C', backgroundColor: 'rgba(229, 169, 60, 0.1)' },
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Refresh TMDB Metadata">
                  <IconButton
                    onClick={onOpenRefresh}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#94A3B8',
                      '&:hover': { color: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.1)' },
                    }}
                  >
                    <SyncIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete Movie">
                  <IconButton
                    onClick={onOpenDelete}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#94A3B8',
                      '&:hover': { color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};
