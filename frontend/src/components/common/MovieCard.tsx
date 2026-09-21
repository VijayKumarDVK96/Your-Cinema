import React from 'react';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { UserMovie } from '../../types/index.js';
import { usePlayer } from '../../context/PlayerContext.js';
import { OttBadge, getOttMeta } from '../../utils/ottProviders.js';
import { isYouTubeSource } from '../../utils/youtube.js';
import { formatRuntime } from '../../utils/formatters.js';

interface MovieCardProps {
  movie: UserMovie;
  recommendationScore?: number;
  selectedOtt?: string;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  onToggleWatched?: (e: React.MouseEvent) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  recommendationScore,
  selectedOtt,
  onToggleFavorite,
  onToggleWatched,
}) => {
  const navigate = useNavigate();
  const { openPlayer } = usePlayer();

  const posterUrl = movie.poster_path
    ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`)
    : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80';

  const year = movie.release_date ? movie.release_date.substring(0, 4) : '';

  // Determine primary streaming provider or active filter OTT provider
  let primarySource = null;
  if (selectedOtt && selectedOtt !== 'all' && selectedOtt !== 'any_ott' && selectedOtt !== 'unassigned') {
    const ottLower = selectedOtt.toLowerCase();
    primarySource = (movie.sources || []).find((s: any) => {
      const pName = (s.provider_name || '').toLowerCase();
      const pIcon = (s.provider_icon || '').toLowerCase();
      if (ottLower.includes('sun')) return pName.includes('sun') || pIcon.includes('sun');
      if (ottLower.includes('prime') || ottLower.includes('amazon')) return pName.includes('prime') || pName.includes('amazon') || pIcon.includes('prime');
      if (ottLower.includes('hotstar') || ottLower.includes('jiohotstar') || ottLower.includes('disney')) return pName.includes('hotstar') || pName.includes('jiohotstar') || pName.includes('disney') || pIcon.includes('hotstar');
      if (ottLower.includes('apple')) return pName.includes('apple') || pIcon.includes('apple');
      if (ottLower.includes('jio')) return pName.includes('jio') || pIcon.includes('jio');
      if (ottLower.includes('zee')) return pName.includes('zee') || pIcon.includes('zee');
      if (ottLower.includes('sony')) return pName.includes('sony') || pIcon.includes('sony');
      if (ottLower.includes('vi')) return pName.includes('vi') || pIcon.includes('vi');
      if (ottLower.includes('aha')) return pName.includes('aha') || pIcon.includes('aha');
      if (ottLower.includes('drive')) return pName.includes('drive') || pIcon.includes('drive');
      return pName.includes(ottLower) || pIcon.includes(ottLower);
    });
  }

  if (!primarySource) {
    primarySource = (movie.sources || []).find((s: any) => s.source_type === 'ott' || s.source_type === 'google_drive') ||
      (movie.sources && movie.sources.length > 0 ? movie.sources[0] : null);
  }

  const tLower = (movie.title || '').toLowerCase();
  let ottInfo: { name: string; icon?: string; url?: string } | null = null;
  if (primarySource) {
    ottInfo = {
      name: primarySource.provider_name,
      icon: primarySource.provider_icon,
      url: primarySource.external_url || undefined,
    };
  } else if (tLower.includes('greatest of all time') || tLower === 'goat' || tLower.includes('inception')) {
    ottInfo = { name: 'Netflix', icon: 'netflix', url: `https://www.netflix.com/search?q=${encodeURIComponent(movie.title)}` };
  } else if (tLower.includes('interstellar') || tLower.includes('arrival')) {
    ottInfo = { name: 'Prime Video', icon: 'prime', url: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(movie.title)}` };
  } else if (tLower.includes('vikram')) {
    ottInfo = { name: 'JioHotstar', icon: 'hotstar', url: `https://www.hotstar.com/in/explore?search_query=${encodeURIComponent(movie.title)}` };
  } else if (tLower.includes('dune') || tLower.includes('oppenheimer')) {
    ottInfo = { name: 'JioCinema', icon: 'jiocinema', url: `https://www.jiocinema.com/search/${encodeURIComponent(movie.title)}` };
  }

  const handleCardClick = () => {
    navigate(`/movies/${movie.user_movie_id}`);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (primarySource && isYouTubeSource(primarySource)) {
      openPlayer(movie, primarySource);
    } else if (primarySource?.source_type === 'google_drive') {
      openPlayer(movie, primarySource);
    } else if (ottInfo?.url && primarySource?.source_type === 'ott') {
      window.open(ottInfo.url, '_blank', 'noopener,noreferrer');
    } else if (movie.trailer_url) {
      openPlayer(movie);
    } else {
      // Navigate to detail page to choose or link sources
      navigate(`/movies/${movie.user_movie_id}`);
    }
  };

  const isResumable = Boolean(
    movie.playback_position_sec &&
    movie.playback_position_sec > 0 &&
    movie.watch_status !== 'watched'
  );

  return (
    <Box
      data-tv-item="true"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleCardClick();
      }}
      sx={{
        position: 'relative',
        borderRadius: 2.5,
        overflow: 'hidden',
        backgroundColor: '#0E131F',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': {
          transform: 'translateY(-6px) scale(1.02)',
          boxShadow: '0 16px 32px rgba(0, 0, 0, 0.6)',
          borderColor: 'rgba(229, 169, 60, 0.4)',
          '& .card-overlay': { opacity: 1 },
          '& .play-btn': { transform: 'scale(1.1)' },
        },
      }}
    >
      {/* Poster Image */}
      <Box sx={{ position: 'relative', paddingTop: '150%', backgroundColor: '#131824', overflow: 'hidden' }}>
        <Box
          component="img"
          src={posterUrl}
          alt={movie.title}
          loading="lazy"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />

        {/* Continue Watching Progress Bar across bottom of poster */}
        {isResumable && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              zIndex: 3,
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${Math.min(
                  Math.round(((movie.playback_position_sec || 0) / ((movie.runtime || 120) * 60)) * 100),
                  98
                )}%`,
                backgroundColor: '#38BDF8',
              }}
            />
          </Box>
        )}

        {/* Hover Action Overlay */}
        <Box
          className="card-overlay"
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(7, 9, 14, 0.75)',
            backdropFilter: 'blur(2px)',
            opacity: 0,
            transition: 'opacity 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 2,
            zIndex: 4,
          }}
        >
          <IconButton
            className="play-btn"
            onClick={handlePlayClick}
            sx={{
              color: isResumable ? '#38BDF8' : '#E5A93C',
              backgroundColor: isResumable ? 'rgba(56, 189, 248, 0.18)' : 'rgba(229, 169, 60, 0.15)',
              mb: 1,
              transition: 'transform 0.2s ease',
              '&:hover': {
                backgroundColor: isResumable ? 'rgba(56, 189, 248, 0.3)' : 'rgba(229, 169, 60, 0.3)',
              },
            }}
          >
            <PlayCircleOutlineIcon sx={{ fontSize: 44 }} />
          </IconButton>
          <Typography variant="caption" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
            {isResumable
              ? `Resume (${movie.last_played_time_formatted || `${Math.floor((movie.playback_position_sec || 0) / 60)}m`})`
              : primarySource && isYouTubeSource(primarySource)
              ? 'Play YouTube'
              : 'Play / Launch'}
          </Typography>
        </Box>

        {/* Top Badges */}
        <Box sx={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {movie.media_type === 'tv' && (
              <Chip
                label="SERIES"
                size="small"
                sx={{
                  backgroundColor: 'rgba(124, 58, 237, 0.9)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.62rem',
                  letterSpacing: '0.06em',
                  height: 20,
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(167, 139, 250, 0.5)',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)',
                }}
              />
            )}
            {recommendationScore !== undefined && (
              <Chip
                label={`${recommendationScore}% Match`}
                size="small"
                sx={{
                  backgroundColor: '#0F172A',
                  color: '#38BDF8',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto', pointerEvents: 'auto' }}>
            {movie.is_favorite && (
              <Box sx={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '50%', p: 0.5, display: 'flex' }}>
                <FavoriteIcon sx={{ color: '#EF4444', fontSize: 16 }} />
              </Box>
            )}
          </Box>
        </Box>

        {/* Status indicator badge */}
        <Box sx={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 0.5, zIndex: 1 }}>
          {movie.watch_status === 'watched' ? (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#10B981 !important' }} />}
              label="Watched"
              size="small"
              sx={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#10B981', fontSize: '0.68rem', height: 22 }}
            />
          ) : movie.watch_status === 'watching' ? (
            <Chip
              label="Watching"
              size="small"
              sx={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', color: '#38BDF8', fontSize: '0.68rem', height: 22 }}
            />
          ) : null}
        </Box>

        {/* OTT Streaming Provider Badge */}
        {ottInfo && (
          <Box sx={{ position: 'absolute', bottom: 8, right: 8, display: 'flex', zIndex: 1 }}>
            <OttBadge providerName={ottInfo.name} providerIcon={ottInfo.icon} size="small" />
          </Box>
        )}
      </Box>

      {/* Info Container */}
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'space-between' }}>
        <Box>
          <Typography
            variant="body1"
            sx={{
              fontWeight: 600,
              color: '#F8FAFC',
              fontSize: '0.95rem',
              lineHeight: 1.25,
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 0.5,
            }}
          >
            {movie.title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 500 }}>
              {movie.media_type === 'tv'
                ? `${year ? `${year} • ` : ''}${movie.number_of_seasons ? `${movie.number_of_seasons} ${movie.number_of_seasons === 1 ? 'Season' : 'Seasons'}` : 'Series'}`
                : `${year}${movie.runtime ? ` • ${formatRuntime(movie.runtime)}` : ''}`}
            </Typography>

            {/* Personal Rating or TMDB Rating */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <StarIcon sx={{ fontSize: 15, color: movie.personal_rating ? '#E5A93C' : '#64748B' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: movie.personal_rating ? '#E5A93C' : '#94A3B8' }}>
                {movie.personal_rating != null && !isNaN(Number(movie.personal_rating))
                  ? Number(movie.personal_rating).toFixed(1)
                  : (movie.vote_average != null && !isNaN(Number(movie.vote_average))
                      ? Number(movie.vote_average).toFixed(1)
                      : '-')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
