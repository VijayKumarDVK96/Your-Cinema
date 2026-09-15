import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Stack,
  Rating,
  Alert,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import StarIcon from '@mui/icons-material/Star';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddLinkIcon from '@mui/icons-material/AddLink';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MovieIcon from '@mui/icons-material/Movie';
import AddIcon from '@mui/icons-material/Add';
import CategoryIcon from '@mui/icons-material/Category';
import VideocamIcon from '@mui/icons-material/Videocam';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CreateIcon from '@mui/icons-material/Create';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EngineeringIcon from '@mui/icons-material/Engineering';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TvIcon from '@mui/icons-material/Tv';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { usePlayer } from '../../context/PlayerContext.js';
import { RatingModal } from '../../components/common/RatingModal.js';
import { EditMovieModal } from '../../components/common/EditMovieModal.js';
import { TmdbRefreshModal } from '../../components/common/TmdbRefreshModal.js';
import { ManageSourcesModal } from '../../components/common/ManageSourcesModal.js';
import { SelectSourceModal } from '../../components/common/SelectSourceModal.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { OttBadge, getOttMeta } from '../../utils/ottProviders.js';
import { isYouTubeSource } from '../../utils/youtube.js';

export const MovieDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { openPlayer } = usePlayer();

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);
  const [manageSourcesOpen, setManageSourcesOpen] = useState(false);
  const [selectSourceOpen, setSelectSourceOpen] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  // Custom Genre Management State
  const [genreDialogOpen, setGenreDialogOpen] = useState(false);
  const [newGenreName, setNewGenreName] = useState('');
  const [newGenreColor, setNewGenreColor] = useState('#38BDF8');

  // Fetch all genres (predefined + custom)
  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return res.data?.data;
    },
  });

  // Single genre select — attach chosen genre (backend replaces existing genre atomically)
  const selectGenreMutation = useMutation({
    mutationFn: async (genreId: string) => {
      await api.post('/genres/attach', { userMovieId: movie.user_movie_id, genreId });
    },
    onSuccess: () => {
      setGenreDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  // Detach (remove) the single active genre
  const detachGenreMutation = useMutation({
    mutationFn: async (genreId?: string) => {
      await api.post('/genres/detach', { userMovieId: movie.user_movie_id, genreId: genreId || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  // Create new custom genre and select it (replaces current)
  const createAndSelectGenreMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const res = await api.post('/genres', data);
      const created = res.data?.data;
      if (created?.id) {
        await api.post('/genres/attach', { userMovieId: movie.user_movie_id, genreId: created.id });
      }
    },
    onSuccess: () => {
      setNewGenreName('');
      setGenreDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });


  // Fetch Movie Details
  const { data: movie, isLoading, error } = useQuery({
    queryKey: ['movie', id],
    queryFn: async () => {
      const res = await api.get(`/movies/${id}`);
      return res.data?.data;
    },
    enabled: !!id,
  });

  // Fetch Similar Movies strictly from user's library
  const { data: libraryMoviesRes } = useQuery({
    queryKey: ['my-movies', 'similar'],
    queryFn: async () => {
      const res = await api.get('/movies?limit=30');
      return res.data?.data?.movies || [];
    },
  });

  // Toggle Favorite Mutation
  const favMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/movies/${id}`, { is_favorite: !movie?.is_favorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  // Toggle Watched Mutation
  const watchMutation = useMutation({
    mutationFn: async () => {
      const nextStatus = movie?.watch_status === 'watched' ? 'unwatched' : 'watched';
      await api.patch(`/movies/${id}`, { watch_status: nextStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['taste-profile'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });

  // Update Series Progress Mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { current_season: number; current_episode: number }) => {
      await api.patch(`/movies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  // Delete Movie Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/movies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      navigate('/movies');
    },
  });

  // Request AI Recommendation Explanation
  const handleExplainAI = async () => {
    setExplaining(true);
    try {
      const res = await api.post(`/ai/explain/${id}`);
      setAiExplanation(res.data?.data?.explanation);
    } catch {
      setAiExplanation('This movie aligns with your preferences for compelling cinema and atmospheric storytelling.');
    } finally {
      setExplaining(false);
    }
  };

  if (isLoading) {
    return <Box sx={{ py: 10, textAlign: 'center', color: '#94A3B8' }}>Loading movie details...</Box>;
  }

  if (error || !movie) {
    return (
      <Box sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: '#EF4444', mb: 2 }}>Movie Not Found</Typography>
        <Button variant="contained" onClick={() => navigate('/movies')}>Return to My Movies</Button>
      </Box>
    );
  }

  const posterUrl = movie.poster_path
    ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`)
    : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80';

  const backdropUrl = movie.backdrop_path
    ? (movie.backdrop_path.startsWith('http') ? movie.backdrop_path : `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`)
    : null;

  // Filter similar movies ONLY from user's library
  const currentGenres = new Set((movie.genres || []).map((g: any) => g.name));
  const librarySimilar = (libraryMoviesRes || [])
    .filter((m: any) => m.user_movie_id !== movie.user_movie_id)
    .filter((m: any) => (m.genres || []).some((g: any) => currentGenres.has(g.name)))
    .slice(0, 6);

  // Resolve primary streaming sources
  const ottSources = (movie.sources || []).filter((s: any) => s.source_type === 'ott');
  const driveSource = (movie.sources || []).find((s: any) => s.source_type === 'google_drive');
  const primaryOttSource = ottSources[0] || null;
  const hasMultipleSources = (movie.sources || []).length > 1;

  // If a stored external_url is a TMDB URL, replace it with the OTT platform's own search URL
  const resolveOttUrl = (src: any): string => {
    const raw = src?.external_url || '';
    if (raw && raw.includes('themoviedb.org')) {
      // Fall back to the platform's search URL
      return getOttMeta(src.provider_name, src.provider_icon).getDefaultSearchUrl(movie.title);
    }
    return raw || getOttMeta(src.provider_name, src.provider_icon).getDefaultSearchUrl(movie.title);
  };

  // Inferred OTT platform for known titles if sources are empty
  const tLower = (movie.title || '').toLowerCase();
  let fallbackOtt: { name: string; icon?: string; url?: string } | null = null;
  if (ottSources.length === 0) {
    if (tLower.includes('greatest of all time') || tLower === 'goat' || tLower.includes('inception')) {
      fallbackOtt = { name: 'Netflix', icon: 'netflix', url: `https://www.netflix.com/search?q=${encodeURIComponent(movie.title)}` };
    } else if (tLower.includes('interstellar') || tLower.includes('arrival')) {
      fallbackOtt = { name: 'Prime Video', icon: 'prime', url: `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(movie.title)}` };
    } else if (tLower.includes('vikram')) {
      fallbackOtt = { name: 'Disney+ Hotstar', icon: 'hotstar', url: `https://www.hotstar.com/in/explore?search_query=${encodeURIComponent(movie.title)}` };
    } else if (tLower.includes('dune') || tLower.includes('oppenheimer')) {
      fallbackOtt = { name: 'JioCinema', icon: 'jiocinema', url: `https://www.jiocinema.com/search/${encodeURIComponent(movie.title)}` };
    }
  }

  const isResumable = Boolean(
    movie.playback_position_sec &&
    movie.playback_position_sec > 0 &&
    movie.watch_status !== 'watched'
  );

  const handlePlayMovie = () => {
    if (hasMultipleSources) {
      setSelectSourceOpen(true);
    } else if (primaryOttSource) {
      if (isYouTubeSource(primaryOttSource)) {
        openPlayer(movie, primaryOttSource);
      } else {
        window.open(resolveOttUrl(primaryOttSource), '_blank', 'noopener,noreferrer');
      }
    } else if (fallbackOtt?.url) {
      if (fallbackOtt.name.toLowerCase().includes('youtube')) {
        openPlayer(movie, {
          id: 'fallback-yt',
          user_movie_id: movie.user_movie_id,
          source_type: 'youtube',
          provider_name: 'YouTube',
          external_url: fallbackOtt.url,
        } as any);
      } else {
        window.open(fallbackOtt.url, '_blank', 'noopener,noreferrer');
      }
    } else if (driveSource) {
      openPlayer(movie, driveSource);
    } else if (movie.trailer_url) {
      openPlayer(movie);
    } else {
      setSelectSourceOpen(true);
    }
  };

  const handleWatchTrailer = () => {
    openPlayer(movie);
  };

  const handleStartOver = async () => {
    try {
      await api.post(`/sources/movie/${movie.user_movie_id}/progress`, {
        positionSec: 0,
        completed: false,
      });
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (e) {}

    const resetMovie = { ...movie, playback_position_sec: 0, watch_status: 'unwatched' as const };
    const chosen =
      (movie.sources || []).find((s: any) => s.source_type === 'google_drive' || isYouTubeSource(s)) ||
      (movie.sources && movie.sources[0]) ||
      null;
    openPlayer(resetMovie, chosen || undefined);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Navigation / Back Button */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/movies')}
          sx={{
            color: '#94A3B8',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(8px)',
            px: 2,
            py: 0.75,
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            transition: 'all 0.2s ease',
            '&:hover': {
              color: '#38BDF8',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              borderColor: 'rgba(56, 189, 248, 0.4)',
              transform: 'translateX(-3px)',
            },
          }}
        >
          Back to My Movies
        </Button>
      </Box>

      {/* Hero Banner Section */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: 3.5,
          overflow: 'hidden',
          backgroundColor: '#0A0E18',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          minHeight: '440px',
          display: 'flex',
          alignItems: 'flex-end',
          p: { xs: 2.5, md: 4.5 },
          backgroundImage: backdropUrl
            ? `linear-gradient(to top, #07090E 15%, rgba(7, 9, 14, 0.8) 50%, rgba(7, 9, 14, 0.3)), url(${backdropUrl})`
            : 'none',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Grid container spacing={4} alignItems="flex-end">
          {/* Poster Column */}
          <Grid item xs={12} sm={4} md={3}>
            <Box
              component="img"
              src={posterUrl}
              alt={movie.title}
              sx={{
                width: '100%',
                objectFit: 'contain',
                borderRadius: 2.5,
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            />
          </Grid>

          {/* Details Column */}
          <Grid item xs={12} sm={8} md={9}>
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
                <Chip
                  label={movie.watch_status.toUpperCase()}
                  size="small"
                  sx={{
                    backgroundColor: movie.watch_status === 'watched' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                    color: movie.watch_status === 'watched' ? '#10B981' : '#38BDF8',
                    fontWeight: 700,
                  }}
                />
                {movie.is_customized && (
                  <Chip
                    label="Custom Edited"
                    size="small"
                    sx={{ backgroundColor: 'rgba(229, 169, 60, 0.2)', color: '#E5A93C', fontWeight: 600 }}
                  />
                )}
                {/* Linked OTT Badges */}
                {ottSources.map((s: any) => (
                  <OttBadge
                    key={s.id}
                    providerName={s.provider_name}
                    providerIcon={s.provider_icon}
                    size="medium"
                    interactive
                    onClick={() => {
                      if (isYouTubeSource(s)) {
                        openPlayer(movie, s);
                      } else {
                        window.open(resolveOttUrl(s), '_blank', 'noopener,noreferrer');
                      }
                    }}
                  />
                ))}
                {ottSources.length === 0 && fallbackOtt && (
                  <OttBadge
                    providerName={fallbackOtt.name}
                    providerIcon={fallbackOtt.icon}
                    size="medium"
                    interactive
                    onClick={() => {
                      if (fallbackOtt?.url) window.open(fallbackOtt.url, '_blank', 'noopener,noreferrer');
                    }}
                  />
                )}
              </Box>

              <Typography variant="h3" sx={{ fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1 }}>
                {movie.title}
              </Typography>

              <Typography variant="body1" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                {movie.media_type === 'tv'
                  ? `${movie.first_air_date ? movie.first_air_date.substring(0, 4) : (movie.release_date?.substring(0, 4) || 'TBD')}${movie.last_air_date && movie.last_air_date.substring(0, 4) !== (movie.first_air_date || movie.release_date || '').substring(0, 4) ? `–${movie.last_air_date.substring(0, 4)}` : ''} • ${movie.number_of_seasons || 1} ${movie.number_of_seasons === 1 ? 'Season' : 'Seasons'}${movie.number_of_episodes ? ` • ${movie.number_of_episodes} Episodes` : ''} • ${movie.created_by && movie.created_by.length > 0 ? `Created by ${movie.created_by.map((c: any) => c.name).join(', ')}` : (movie.director ? `Directed by ${movie.director}` : '')}`
                  : `${movie.release_date?.substring(0, 4)} • ${movie.runtime ? `${movie.runtime} min` : 'Runtime TBD'} • Directed by ${movie.director || 'Unknown'}`}
              </Typography>

              {/* Ratings */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, my: 0.5 }}>
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

              {/* Single Genre Chip */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.8 }}>
                {(() => {
                  // Prefer custom genre if set
                  const activeCustom = (movie.custom_genres || [])[0];
                  if (activeCustom) {
                    return (
                      <Chip
                        key={activeCustom.id}
                        icon={<AutoAwesomeIcon sx={{ fontSize: '13px !important', color: `${activeCustom.color || '#38BDF8'} !important` }} />}
                        label={activeCustom.name}
                        size="small"
                        onDelete={() => detachGenreMutation.mutate(activeCustom.id)}
                        sx={{
                          backgroundColor: `${activeCustom.color || '#38BDF8'}22`,
                          color: activeCustom.color || '#38BDF8',
                          border: `1px solid ${activeCustom.color || '#38BDF8'}55`,
                          fontWeight: 600,
                        }}
                      />
                    );
                  }
                  // Otherwise show first predefined genre
                  const activePredefined = (movie.genres || [])[0];
                  if (activePredefined) {
                    return (
                      <Chip
                        key={activePredefined.id || activePredefined.name}
                        label={activePredefined.name}
                        size="small"
                        onDelete={() => detachGenreMutation.mutate(String(activePredefined.name || activePredefined.id))}
                        sx={{
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          color: '#E2E8F0',
                          '& .MuiChip-deleteIcon': {
                            color: 'rgba(255,255,255,0.35)',
                            fontSize: '15px',
                            '&:hover': { color: '#EF4444' },
                          },
                        }}
                      />
                    );
                  }
                  return null;
                })()}
                {(movie.tags || []).map((t: any) => (
                  <Chip key={t.id} label={`#${t.name}`} size="small" sx={{ backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C' }} />
                ))}
                <Chip
                  icon={<AddIcon sx={{ fontSize: '14px !important', color: '#38BDF8 !important' }} />}
                  label={((movie.custom_genres || []).length > 0 || (movie.genres || []).length > 0) ? 'Change Genre' : 'Set Genre'}
                  size="small"
                  onClick={() => setGenreDialogOpen(true)}
                  sx={{
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    color: '#38BDF8',
                    border: '1px dashed rgba(56, 189, 248, 0.4)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    '&:hover': { backgroundColor: 'rgba(56, 189, 248, 0.2)' },
                  }}
                />
              </Box>

              {/* Action Buttons — Primary row */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 1, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  color={isResumable ? 'secondary' : 'primary'}
                  size="large"
                  startIcon={primaryOttSource && !isYouTubeSource(primaryOttSource) ? <OpenInNewIcon /> : <PlayArrowIcon />}
                  onClick={handlePlayMovie}
                  sx={{ fontWeight: 700, px: 3.5 }}
                >
                  {isResumable
                    ? `Resume Playback (${movie.last_played_time_formatted || `${Math.floor((movie.playback_position_sec || 0) / 60)}m`})`
                    : primaryOttSource
                    ? (isYouTubeSource(primaryOttSource) ? 'Play on YouTube' : `Stream on ${primaryOttSource.provider_name}`)
                    : fallbackOtt
                    ? (fallbackOtt.name.toLowerCase().includes('youtube') ? 'Play on YouTube' : `Stream on ${fallbackOtt.name}`)
                    : driveSource
                    ? (movie.media_type === 'tv' ? 'Play Episode' : 'Play Movie')
                    : (movie.media_type === 'tv' ? 'Stream Series' : 'Stream / Play Movie')}
                </Button>

                {isResumable && (
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="large"
                    startIcon={<RestartAltIcon />}
                    onClick={handleStartOver}
                    sx={{ borderColor: 'rgba(255,255,255,0.25)', color: '#F8FAFC', fontWeight: 600, px: 2.5 }}
                  >
                    Start Over
                  </Button>
                )}

                {movie.trailer_url && (
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<MovieIcon />}
                    onClick={handleWatchTrailer}
                    sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#F8FAFC', fontWeight: 600 }}
                  >
                    Watch Trailer
                  </Button>
                )}

                <Button
                  variant="outlined"
                  color={movie.watch_status === 'watched' ? 'success' : 'inherit'}
                  startIcon={<CheckCircleIcon />}
                  onClick={() => watchMutation.mutate()}
                >
                  {movie.watch_status === 'watched' ? 'Watched ✓' : 'Mark Watched'}
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<StarIcon />}
                  onClick={() => setRatingModalOpen(true)}
                >
                  Rate & Log
                </Button>
              </Box>

              {/* Action Buttons — Secondary utility row */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5, alignItems: 'center' }}>
                <Tooltip title={movie.is_favorite ? 'Remove from favorites' : 'Add to favorites'}>
                  <IconButton
                    onClick={() => favMutation.mutate()}
                    size="small"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      backgroundColor: movie.is_favorite ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      border: movie.is_favorite ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: movie.is_favorite ? '#EF4444' : '#64748B',
                      transition: 'all 0.2s ease',
                      '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.5)', color: '#EF4444' },
                    }}
                  >
                    {movie.is_favorite ? <FavoriteIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Edit movie details & overrides">
                  <IconButton
                    onClick={() => setEditModalOpen(true)}
                    size="small"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#64748B',
                      transition: 'all 0.2s ease',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255,255,255,0.22)', color: '#F8FAFC' },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Refresh metadata from TMDB">
                  <IconButton
                    onClick={() => setRefreshModalOpen(true)}
                    size="small"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(56, 189, 248, 0.06)',
                      border: '1px solid rgba(56, 189, 248, 0.2)',
                      color: '#38BDF8',
                      transition: 'all 0.2s ease',
                      '&:hover': { backgroundColor: 'rgba(56, 189, 248, 0.16)', borderColor: 'rgba(56, 189, 248, 0.5)', color: '#7DD3FC' },
                    }}
                  >
                    <SyncIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Remove from library">
                  <IconButton
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to remove "${movie.title}" from your personal library?`)) {
                        deleteMutation.mutate();
                      }
                    }}
                    size="small"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#64748B',
                      transition: 'all 0.2s ease',
                      '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#EF4444' },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* Continue Watching Progress on Movie Detail */}
              {isResumable && (
                <Box sx={{ width: '100%', maxWidth: 480, mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      Math.round(((movie.playback_position_sec || 0) / ((movie.runtime || 120) * 60)) * 100),
                      98
                    )}
                    sx={{
                      flexGrow: 1,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': { backgroundColor: '#38BDF8' },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#38BDF8', fontWeight: 600 }}>
                    {Math.floor((movie.playback_position_sec || 0) / 60)}m / {movie.runtime || 120}m watched
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Overview & Personal Notes */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {/* Watching Progress Tracker for Web Series */}
          {movie.media_type === 'tv' && (
            <Paper
              sx={{
                p: 2.5,
                mb: 3,
                backgroundColor: '#0B0F19',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, #0B0F19 100%)',
                borderRadius: 2.5,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ p: 1.2, borderRadius: 2, backgroundColor: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
                    <LiveTvIcon sx={{ color: '#A78BFA', fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#A78BFA', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Watching Progress
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 800 }}>
                      Season {movie.current_season || 1}, Episode {movie.current_episode || 1}
                    </Typography>
                  </Box>
                </Box>

                {/* Progress Steppers & Quick Increment */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const nextEp = (movie.current_episode || 1) + 1;
                      updateProgressMutation.mutate({
                        current_season: movie.current_season || 1,
                        current_episode: nextEp,
                      });
                    }}
                    sx={{
                      backgroundColor: '#7C3AED',
                      '&:hover': { backgroundColor: '#6D28D9' },
                      fontWeight: 700,
                      px: 2,
                    }}
                  >
                    +1 Episode
                  </Button>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 2, p: 0.5, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', px: 1 }}>
                      Season:
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={(movie.current_season || 1) <= 1}
                      onClick={() => updateProgressMutation.mutate({
                        current_season: Math.max(1, (movie.current_season || 1) - 1),
                        current_episode: 1,
                      })}
                      sx={{ color: '#CBD5E1' }}
                    >
                      <RemoveCircleOutlineIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC', px: 0.5 }}>
                      {movie.current_season || 1}
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={movie.number_of_seasons ? (movie.current_season || 1) >= movie.number_of_seasons : false}
                      onClick={() => updateProgressMutation.mutate({
                        current_season: (movie.current_season || 1) + 1,
                        current_episode: 1,
                      })}
                      sx={{ color: '#CBD5E1' }}
                    >
                      <AddCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 2, p: 0.5, backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                    <Typography variant="caption" sx={{ color: '#94A3B8', px: 1 }}>
                      Episode:
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={(movie.current_episode || 1) <= 1}
                      onClick={() => updateProgressMutation.mutate({
                        current_season: movie.current_season || 1,
                        current_episode: Math.max(1, (movie.current_episode || 1) - 1),
                      })}
                      sx={{ color: '#CBD5E1' }}
                    >
                      <RemoveCircleOutlineIcon fontSize="small" />
                    </IconButton>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC', px: 0.5 }}>
                      {movie.current_episode || 1}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => updateProgressMutation.mutate({
                        current_season: movie.current_season || 1,
                        current_episode: (movie.current_episode || 1) + 1,
                      })}
                      sx={{ color: '#CBD5E1' }}
                    >
                      <AddCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Paper>
          )}

          <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 1.5 }}>
              Synopsis
            </Typography>
            <Typography variant="body1" sx={{ color: '#94A3B8', lineHeight: 1.7, mb: 3 }}>
              {movie.overview || 'No synopsis recorded.'}
            </Typography>

            {movie.personal_notes && (
              <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(229, 169, 60, 0.08)', borderLeft: '4px solid #E5A93C' }}>
                <Typography variant="subtitle2" sx={{ color: '#E5A93C', fontWeight: 700, mb: 0.5 }}>
                  My Personal Note
                </Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontStyle: 'italic' }}>
                  "{movie.personal_notes}"
                </Typography>
              </Box>
            )}
          </Paper>

          {/* AI / Recommendation Insight */}
          <Paper sx={{ p: 3, mt: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon sx={{ color: '#38BDF8' }} /> Why This Movie in Your Cinema?
              </Typography>
              {!aiExplanation && (
                <Button size="small" color="secondary" onClick={handleExplainAI} disabled={explaining}>
                  {explaining ? 'Analyzing...' : 'Generate AI Insight'}
                </Button>
              )}
            </Box>
            <Typography variant="body2" sx={{ color: '#94A3B8', lineHeight: 1.6 }}>
              {aiExplanation ||
                `"${movie.title}" was selected based on your affinity for ${
                  (movie.genres || []).map((g: any) => g.name).join(', ') || 'quality storytelling'
                } and films with similar narrative craftsmanship in your collection.`}
            </Typography>
          </Paper>

          {/* Cast Members Section */}
          {movie.cast_members && movie.cast_members.length > 0 && (
            <Paper sx={{ p: 3, mt: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PeopleAltIcon sx={{ color: '#E5A93C' }} />
                <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                  Top Billed Cast ({movie.cast_members.length})
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {movie.cast_members.map((c: any, idx: number) => {
                  const photoUrl = c.profile_path
                    ? (c.profile_path.startsWith('http') ? c.profile_path : `https://image.tmdb.org/t/p/w185${c.profile_path}`)
                    : null;
                  return (
                    <Grid item xs={6} sm={4} md={3} key={idx}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            borderColor: 'rgba(229, 169, 60, 0.3)',
                            transform: 'translateY(-2px)',
                          },
                        }}
                      >
                        <Avatar
                          src={photoUrl || undefined}
                          alt={c.name}
                          sx={{
                            width: 44,
                            height: 44,
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backgroundColor: '#1E293B',
                            color: '#E5A93C',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                          }}
                        >
                          {c.name.charAt(0)}
                        </Avatar>
                        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                          <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {c.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {c.character || 'Cast'}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          )}

          {/* Key Technicians & Crew Section */}
          {movie.crew_members && movie.crew_members.length > 0 && (
            <Paper sx={{ p: 3, mt: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EngineeringIcon sx={{ color: '#38BDF8' }} />
                <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                  Key Technicians & Crew
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {movie.crew_members.map((member: any, idx: number) => {
                  const job = member.job || 'Crew';
                  let icon = <EngineeringIcon sx={{ fontSize: 20, color: '#38BDF8' }} />;
                  let roleBadgeColor = '#38BDF8';
                  let roleBgColor = 'rgba(56, 189, 248, 0.12)';

                  if (job.includes('Director') && !job.includes('Art') && !job.includes('Photography')) {
                    icon = <VideocamIcon sx={{ fontSize: 20, color: '#E5A93C' }} />;
                    roleBadgeColor = '#E5A93C';
                    roleBgColor = 'rgba(229, 169, 60, 0.15)';
                  } else if (job.includes('Music') || job.includes('Composer') || member.department === 'Sound') {
                    icon = <MusicNoteIcon sx={{ fontSize: 20, color: '#A855F7' }} />;
                    roleBadgeColor = '#A855F7';
                    roleBgColor = 'rgba(168, 85, 247, 0.15)';
                  } else if (job.includes('Photography') || job.includes('Camera') || member.department === 'Camera') {
                    icon = <CameraAltIcon sx={{ fontSize: 20, color: '#06B6D4' }} />;
                    roleBadgeColor = '#06B6D4';
                    roleBgColor = 'rgba(6, 182, 212, 0.15)';
                  } else if (job.includes('Editor')) {
                    icon = <ContentCutIcon sx={{ fontSize: 20, color: '#10B981' }} />;
                    roleBadgeColor = '#10B981';
                    roleBgColor = 'rgba(16, 185, 129, 0.15)';
                  } else if (job.includes('Writer') || job.includes('Screenplay') || job.includes('Story')) {
                    icon = <CreateIcon sx={{ fontSize: 20, color: '#F59E0B' }} />;
                    roleBadgeColor = '#F59E0B';
                    roleBgColor = 'rgba(245, 158, 11, 0.15)';
                  } else if (job.includes('Producer')) {
                    icon = <BusinessCenterIcon sx={{ fontSize: 20, color: '#EC4899' }} />;
                    roleBadgeColor = '#EC4899';
                    roleBgColor = 'rgba(236, 72, 153, 0.15)';
                  } else if (job.includes('Stunt')) {
                    icon = <SportsMartialArtsIcon sx={{ fontSize: 20, color: '#EF4444' }} />;
                    roleBadgeColor = '#EF4444';
                    roleBgColor = 'rgba(239, 68, 68, 0.15)';
                  }

                  return (
                    <Grid item xs={12} sm={6} md={4} key={idx}>
                      <Box
                        sx={{
                          p: 1.8,
                          borderRadius: 2,
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                        }}
                      >
                        <Box
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            backgroundColor: roleBgColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {icon}
                        </Box>
                        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
                          <Typography variant="caption" sx={{ color: roleBadgeColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>
                            {job}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {member.name}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          )}

          {/* Seasons & Episodes Breakdown for TV Series */}
          {movie.media_type === 'tv' && movie.seasons && movie.seasons.length > 0 && (
            <Paper sx={{ p: 3, mt: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TvIcon sx={{ color: '#A78BFA' }} />
                  <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                    Seasons & Episodes ({movie.seasons.length})
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  {movie.number_of_episodes ? `${movie.number_of_episodes} Total Episodes` : ''}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                {movie.seasons.map((s: any) => {
                  const isCurrent = (movie.current_season || 1) === s.season_number;
                  const seasonPoster = s.poster_path
                    ? (s.poster_path.startsWith('http') ? s.poster_path : `https://image.tmdb.org/t/p/w185${s.poster_path}`)
                    : posterUrl;
                  return (
                    <Grid item xs={12} sm={6} key={s.id || s.season_number}>
                      <Box
                        sx={{
                          p: 1.8,
                          borderRadius: 2.5,
                          backgroundColor: isCurrent ? 'rgba(124, 58, 237, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                          border: isCurrent ? '1px solid rgba(167, 139, 250, 0.45)' : '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          gap: 2,
                          alignItems: 'center',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.04)',
                            borderColor: 'rgba(167, 139, 250, 0.3)',
                          },
                        }}
                      >
                        <Box
                          component="img"
                          src={seasonPoster}
                          alt={s.name}
                          sx={{
                            width: 54,
                            height: 80,
                            borderRadius: 1.5,
                            objectFit: 'cover',
                            backgroundColor: '#1E293B',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          }}
                        />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {s.name}
                            </Typography>
                            {isCurrent && (
                              <Chip label="Current" size="small" sx={{ height: 18, fontSize: '0.62rem', backgroundColor: '#7C3AED', color: '#FFF', fontWeight: 700 }} />
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: '#A78BFA', fontWeight: 600, display: 'block', mt: 0.3 }}>
                            {s.episode_count} Episodes {s.air_date ? `• ${s.air_date.substring(0, 4)}` : ''}
                          </Typography>
                          {s.season_number > 0 && !isCurrent && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={() => updateProgressMutation.mutate({ current_season: s.season_number, current_episode: 1 })}
                              sx={{ color: '#38BDF8', fontSize: '0.72rem', p: 0, mt: 0.5, textTransform: 'none' }}
                            >
                              Jump to this season →
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          )}
        </Grid>

        {/* Sources & Playback Options Column */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                Playback & Streaming Sources
              </Typography>
              <Button
                size="small"
                startIcon={<AddLinkIcon />}
                onClick={() => setManageSourcesOpen(true)}
                sx={{ color: '#38BDF8', fontSize: '0.78rem' }}
              >
                Manage
              </Button>
            </Box>

            {movie.sources && movie.sources.length > 0 ? (
              <Stack spacing={1.5}>
                {movie.sources.map((src: any) => {
                  const isOtt = src.source_type === 'ott';
                  return (
                    <Box
                      key={src.id}
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <OttBadge providerName={src.provider_name} providerIcon={src.provider_icon} size="small" />
                        <Box>
                          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                            {src.source_type.replace('_', ' ').toUpperCase()} • {src.quality || '1080p'}
                          </Typography>
                        </Box>
                      </Box>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        endIcon={isOtt && !isYouTubeSource(src) && src.external_url ? <OpenInNewIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                        onClick={() => {
                          if (isYouTubeSource(src)) {
                            openPlayer(movie, src);
                          } else if (isOtt) {
                            window.open(resolveOttUrl(src), '_blank', 'noopener,noreferrer');
                          } else {
                            openPlayer(movie, src);
                          }
                        }}
                      >
                        {isOtt && !isYouTubeSource(src) ? 'Stream' : (isResumable ? 'Resume' : 'Play')}
                      </Button>
                    </Box>
                  );
                })}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddLinkIcon />}
                  onClick={() => setManageSourcesOpen(true)}
                  sx={{ borderColor: 'rgba(255,255,255,0.1)', color: '#CBD5E1', mt: 1 }}
                >
                  + Link Another Source
                </Button>
              </Stack>
            ) : (
              <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
                  No external sources linked yet.
                </Typography>
                <Stack spacing={1.2}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<AddLinkIcon />}
                    onClick={() => setManageSourcesOpen(true)}
                    sx={{ fontWeight: 700 }}
                  >
                    Link Netflix / Prime / Drive
                  </Button>
                  {movie.trailer_url && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="secondary"
                      startIcon={<MovieIcon />}
                      onClick={handleWatchTrailer}
                    >
                      Watch Official Trailer
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
          </Paper>

          {/* Film / Series Details & Specifications Card */}
          <Paper sx={{ p: 3, mt: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <InfoOutlinedIcon sx={{ color: '#E5A93C', fontSize: 20 }} />
              <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                {movie.media_type === 'tv' ? 'Series Details & Specs' : 'Film Details & Specs'}
              </Typography>
            </Box>

            <Stack spacing={1.5}>
              {movie.media_type === 'tv' ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Creator(s)</Typography>
                    <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                      {(movie.created_by || []).map((c: any) => c.name).join(', ') || movie.director || 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Series Status</Typography>
                    <Typography variant="body2" sx={{ color: '#38BDF8', fontWeight: 600 }}>{movie.series_status || 'Released'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Total Seasons</Typography>
                    <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.number_of_seasons || 1}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Total Episodes</Typography>
                    <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.number_of_episodes || 'N/A'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>First Air Date</Typography>
                    <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.first_air_date || movie.release_date || 'TBD'}</Typography>
                  </Box>
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Director</Typography>
                    <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.director || 'Unknown'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Release Date</Typography>
                    <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.release_date || 'TBD'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Runtime</Typography>
                    <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.runtime ? `${movie.runtime} min` : 'TBD'}</Typography>
                  </Box>
                </>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Original Language</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600, textTransform: 'uppercase' }}>{movie.original_language || 'N/A'}</Typography>
              </Box>

              {movie.original_title && movie.original_title !== movie.title && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>Original Title</Typography>
                  <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600, fontStyle: 'italic' }}>{movie.original_title}</Typography>
                </Box>
              )}
              {movie.spoken_languages && movie.spoken_languages.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography variant="body2" sx={{ color: '#64748B' }}>Spoken Languages</Typography>
                  <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600, textTransform: 'uppercase' }}>
                    {movie.spoken_languages.join(', ')}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Similar Movies ONLY From User's Library */}
      {librarySimilar.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC', mb: 0.5 }}>
            Similar Films in Your Library
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
            Connected purely through your own catalog — never external recommendations
          </Typography>
          <Grid container spacing={2}>
            {librarySimilar.map((m: any) => (
              <Grid item xs={6} sm={4} md={2} key={m.user_movie_id}>
                <MovieCard movie={m} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Modals */}
      <RatingModal
        open={ratingModalOpen}
        onClose={() => setRatingModalOpen(false)}
        userMovieId={movie.user_movie_id}
        movieTitle={movie.title}
        initialRating={movie.personal_rating}
        initialNotes={movie.personal_notes}
        onRated={() => queryClient.invalidateQueries({ queryKey: ['movie', id] })}
      />

      <EditMovieModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        movie={movie}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ['movie', id] })}
      />

      <TmdbRefreshModal
        open={refreshModalOpen}
        onClose={() => setRefreshModalOpen(false)}
        userMovieId={movie.user_movie_id}
        onRefreshed={() => queryClient.invalidateQueries({ queryKey: ['movie', id] })}
      />

      <ManageSourcesModal
        open={manageSourcesOpen}
        onClose={() => setManageSourcesOpen(false)}
        movie={movie}
        onSourcesChanged={() => queryClient.invalidateQueries({ queryKey: ['movie', id] })}
      />

      <SelectSourceModal
        open={selectSourceOpen}
        onClose={() => setSelectSourceOpen(false)}
        movie={movie}
        onLaunchSource={(src) => {
          if (isYouTubeSource(src)) {
            openPlayer(movie, src);
          } else if (src.source_type === 'ott' && src.external_url) {
            window.open(src.external_url, '_blank', 'noopener,noreferrer');
          } else {
            openPlayer(movie, src);
          }
        }}
        onWatchTrailer={handleWatchTrailer}
        onManageSources={() => setManageSourcesOpen(true)}
      />

      {/* Genre Selection Dialog — single genre per movie */}
      <Dialog
        open={genreDialogOpen}
        onClose={() => setGenreDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            minWidth: 380,
            maxWidth: 480,
          },
        }}
      >
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CategoryIcon sx={{ color: '#38BDF8' }} /> Select Genre
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
            Pick one genre for <strong>"{movie?.title}"</strong>. This replaces the current genre.
          </Typography>

          {/* Predefined genres */}
          {(genresData?.predefined || []).length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                Predefined Genres (Select One)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, maxHeight: 130, overflowY: 'auto', pr: 0.5 }}>
                {(genresData?.predefined || []).map((pg: any) => {
                  const currentName = ((movie?.custom_genres || [])[0]?.name || (movie?.genres || [])[0]?.name || '').toLowerCase();
                  const isActive = currentName === pg.name.toLowerCase();
                  return (
                    <Chip
                      key={pg.id || pg.name}
                      label={pg.name}
                      size="small"
                      onClick={() => selectGenreMutation.mutate(pg.name)}
                      disabled={selectGenreMutation.isPending}
                      sx={{
                        backgroundColor: isActive ? `${pg.color || '#38BDF8'}33` : 'rgba(255,255,255,0.05)',
                        color: isActive ? '#F8FAFC' : (pg.color || '#94A3B8'),
                        border: isActive ? `1.5px solid ${pg.color || '#38BDF8'}` : '1px solid rgba(255,255,255,0.1)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.12)' },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          {/* User custom genres */}
          {genresData?.custom && genresData.custom.length > 0 && (
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
                Your Custom Genres (Select One)
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {genresData.custom.map((cg: any) => {
                  const currentName = ((movie?.custom_genres || [])[0]?.name || (movie?.genres || [])[0]?.name || '').toLowerCase();
                  const isActive = currentName === cg.name.toLowerCase();
                  return (
                    <Chip
                      key={cg.id}
                      label={cg.name}
                      size="small"
                      onClick={() => selectGenreMutation.mutate(cg.id)}
                      disabled={selectGenreMutation.isPending}
                      sx={{
                        backgroundColor: isActive ? `${cg.color || '#38BDF8'}33` : 'rgba(255, 255, 255, 0.05)',
                        color: isActive ? (cg.color || '#38BDF8') : '#94A3B8',
                        border: isActive ? `1.5px solid ${cg.color || '#38BDF8'}` : '1px solid rgba(255, 255, 255, 0.1)',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: `${cg.color || '#38BDF8'}22` },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Create new custom genre */}
          <Typography variant="caption" sx={{ color: '#38BDF8', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
            + Create New Genre
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="e.g. Cyberpunk, Neo-Noir, Space Opera..."
            value={newGenreName}
            onChange={(e) => setNewGenreName(e.target.value)}
            sx={{
              mb: 2,
              input: { color: '#F8FAFC' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                '&:hover fieldset': { borderColor: '#38BDF8' },
                '&.Mui-focused fieldset': { borderColor: '#38BDF8' },
              },
            }}
          />

          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1 }}>
            Theme Color:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {['#38BDF8', '#EC4899', '#8B5CF6', '#E5A93C', '#10B981', '#F43F5E', '#06B6D4', '#EAB308'].map((c) => (
              <Box
                key={c}
                onClick={() => setNewGenreColor(c)}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border: newGenreColor === c ? '2px solid #FFF' : '2px solid transparent',
                  transform: newGenreColor === c ? 'scale(1.2)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setGenreDialogOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!newGenreName.trim() || createAndSelectGenreMutation.isPending}
            onClick={() => {
              createAndSelectGenreMutation.mutate({ name: newGenreName.trim(), color: newGenreColor });
            }}
            sx={{ fontWeight: 700 }}
          >
            Create & Set
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
