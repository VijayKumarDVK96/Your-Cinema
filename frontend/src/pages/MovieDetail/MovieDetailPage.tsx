import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GroupIcon from '@mui/icons-material/Group';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import VideocamIcon from '@mui/icons-material/Videocam';
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
import { ConfirmDeleteModal } from '../../components/ui/index.js';
import { formatRuntime } from '../../utils/formatters.js';
import { isYouTubeSource } from '../../utils/youtube.js';
import { isDriveSource } from '../../utils/googleDrive.js';
import { getOttMeta } from '../../utils/ottProviders.js';
import {
  MovieHero,
  MovieOverviewTab,
  MovieCastCrewTab,
  MoviePostersTab,
  MovieBackdropsTab,
  MovieSourcesSidebar,
  CastCrewModal,
  FullscreenBackdropModal,
  GenreManageDialog,
} from './components/index.js';

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [genreDialogOpen, setGenreDialogOpen] = useState(false);
  const [castCrewModalOpen, setCastCrewModalOpen] = useState(false);
  const [castModalFilter, setCastModalFilter] = useState<'all' | 'cast' | 'crew'>('all');
  const [fullscreenBackdropOpen, setFullscreenBackdropOpen] = useState(false);

  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [mainTab, setMainTab] = useState<'overview' | 'cast_crew' | 'posters' | 'screenshots'>('overview');

  // Fetch all genres
  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return res.data?.data;
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

  // Query TMDB images for Posters & Screenshots tabs
  const { data: tmdbImages, isLoading: imagesLoading } = useQuery({
    queryKey: ['tmdb-images', movie?.tmdb_id, movie?.media_type],
    queryFn: async () => {
      if (!movie?.tmdb_id) return null;
      const res = await api.get(`/tmdb/images/${movie.tmdb_id}?mediaType=${movie.media_type || 'movie'}`);
      return res.data?.data;
    },
    enabled: !!movie?.tmdb_id && (mainTab === 'posters' || mainTab === 'screenshots'),
  });

  // Fetch Similar Movies strictly from user's library
  const { data: libraryMoviesRes } = useQuery({
    queryKey: ['my-movies', 'similar'],
    queryFn: async () => {
      const res = await api.get('/movies?limit=30');
      return res.data?.data?.movies || [];
    },
  });

  // Mutations
  const selectGenreMutation = useMutation({
    mutationFn: async (genreId: string | number) => {
      await api.post('/genres/attach', { userMovieId: movie.user_movie_id, genreId: String(genreId) });
    },
    onSuccess: () => {
      setGenreDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  const detachGenreMutation = useMutation({
    mutationFn: async (genreId?: string | number) => {
      await api.post('/genres/detach', { userMovieId: movie.user_movie_id, genreId: String(genreId || '') });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  const createAndSelectGenreMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const res = await api.post('/genres', data);
      const created = res.data?.data;
      if (created?.id) {
        await api.post('/genres/attach', { userMovieId: movie.user_movie_id, genreId: created.id });
      }
    },
    onSuccess: () => {
      setGenreDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  const setDefaultPosterMutation = useMutation({
    mutationFn: async (posterPath: string) => {
      const fullPosterUrl = posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/original${posterPath}`;
      await api.patch(`/movies/${movie.user_movie_id}`, { custom_poster_url: fullPosterUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });

  const setDefaultBackdropMutation = useMutation({
    mutationFn: async (backdropPath: string) => {
      const fullBackdropUrl = backdropPath.startsWith('http') ? backdropPath : `https://image.tmdb.org/t/p/original${backdropPath}`;
      await api.patch(`/movies/${movie.user_movie_id}`, { custom_backdrop_url: fullBackdropUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });

  const favMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/movies/${id}`, { is_favorite: !movie?.is_favorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

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

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { current_season: number; current_episode: number }) => {
      await api.patch(`/movies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', id] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/movies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      navigate('/movies');
    },
  });

  // Handlers
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

  const backdropUrl = movie.custom_backdrop_url || (movie.backdrop_path
    ? (movie.backdrop_path.startsWith('http') ? movie.backdrop_path : `https://image.tmdb.org/t/p/original${movie.backdrop_path}`)
    : null);

  const currentGenres = new Set((movie.genres || []).map((g: any) => g.name));
  const librarySimilar = (libraryMoviesRes || [])
    .filter((m: any) => m.user_movie_id !== movie.user_movie_id)
    .filter((m: any) => (m.genres || []).some((g: any) => currentGenres.has(g.name)))
    .slice(0, 6);

  const driveSource = (movie.sources || []).find((s: any) => isDriveSource(s));
  const youtubeSource = (movie.sources || []).find((s: any) => isYouTubeSource(s));
  const ottSources = (movie.sources || []).filter((s: any) => !isDriveSource(s) && !isYouTubeSource(s));
  const primaryOttSource = ottSources[0] || null;
  const hasMultipleSources = (movie.sources || []).length > 1;

  const resolveOttUrl = (src: any): string => {
    const raw = src?.external_url || '';
    if (raw && raw.includes('themoviedb.org')) {
      return getOttMeta(src.provider_name, src.provider_icon).getDefaultSearchUrl(movie.title);
    }
    return raw || getOttMeta(src.provider_name, src.provider_icon).getDefaultSearchUrl(movie.title);
  };

  const isResumable = Boolean(
    movie.playback_position_sec &&
    movie.playback_position_sec > 0 &&
    movie.watch_status !== 'watched'
  );

  const handlePlayMovie = () => {
    if (hasMultipleSources) {
      setSelectSourceOpen(true);
    } else if (driveSource) {
      openPlayer(movie, driveSource);
    } else if (youtubeSource) {
      openPlayer(movie, youtubeSource);
    } else if (primaryOttSource) {
      window.open(resolveOttUrl(primaryOttSource), '_blank', 'noopener,noreferrer');
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
      (movie.sources || []).find((s: any) => isDriveSource(s) || isYouTubeSource(s)) ||
      (movie.sources && movie.sources[0]) ||
      null;
    openPlayer(resetMovie, chosen || undefined);
  };

  const handleOpenCastModal = (filter: 'all' | 'cast' | 'crew') => {
    setCastModalFilter(filter);
    setCastCrewModalOpen(true);
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
      <MovieHero
        movie={movie}
        posterUrl={posterUrl}
        backdropUrl={backdropUrl}
        ottSources={movie.sources || []}
        isResumable={isResumable}
        onPlay={handlePlayMovie}
        onStartOver={handleStartOver}
        onWatchTrailer={handleWatchTrailer}
        onToggleStatus={() => watchMutation.mutate()}
        onToggleFavorite={() => favMutation.mutate()}
        onOpenRating={() => setRatingModalOpen(true)}
        onOpenEdit={() => setEditModalOpen(true)}
        onOpenRefresh={() => setRefreshModalOpen(true)}
        onOpenDelete={() => setDeleteConfirmOpen(true)}
        onOpenFullscreenBackdrop={() => setFullscreenBackdropOpen(true)}
        onOpenGenreDialog={() => setGenreDialogOpen(true)}
        onDetachGenre={(genreId) => detachGenreMutation.mutate(genreId)}
        formatRuntime={formatRuntime}
      />

      {/* Main Content Area */}
      <Grid container spacing={3}>
        {/* Left Column: Tabs Content */}
        <Grid item xs={12} md={8}>
          {/* Main Content Tabs */}
          <Paper
            sx={{
              backgroundColor: '#0B0F19',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 2.5,
              mb: 3,
              p: 0.5,
            }}
          >
            <Tabs
              value={mainTab}
              onChange={(_, val) => setMainTab(val)}
              textColor="inherit"
              sx={{
                '& .MuiTabs-indicator': {
                  backgroundColor: '#E5A93C',
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
                '& .MuiTab-root': {
                  color: '#94A3B8',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  textTransform: 'none',
                  minHeight: 48,
                  px: 3,
                  '&.Mui-selected': {
                    color: '#F8FAFC',
                  },
                },
              }}
            >
              <Tab
                value="overview"
                label="Overview"
                icon={<InfoOutlinedIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                value="cast_crew"
                label={`Cast & Crew (${(movie.cast_members?.length || 0) + (movie.crew_members?.length || 0)})`}
                icon={<GroupIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                value="posters"
                label="Posters"
                icon={<CameraAltIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                value="screenshots"
                label="Screenshots & Backdrops"
                icon={<VideocamIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
            </Tabs>
          </Paper>

          {/* Tab 1: Overview */}
          {mainTab === 'overview' && (
            <MovieOverviewTab
              movie={movie}
              posterUrl={posterUrl}
              aiExplanation={aiExplanation}
              explaining={explaining}
              onExplainAI={handleExplainAI}
              onUpdateProgress={(updates) => updateProgressMutation.mutate(updates)}
            />
          )}

          {/* Tab 2: Cast & Crew */}
          {mainTab === 'cast_crew' && (
            <MovieCastCrewTab
              movie={movie}
              onOpenCastModal={handleOpenCastModal}
            />
          )}

          {/* Tab 3: Posters */}
          {mainTab === 'posters' && (
            <MoviePostersTab
              movie={movie}
              tmdbImages={tmdbImages}
              imagesLoading={imagesLoading}
              onSetDefaultPoster={(path) => setDefaultPosterMutation.mutate(path)}
              isSettingPoster={setDefaultPosterMutation.isPending}
            />
          )}

          {/* Tab 4: Screenshots & Backdrops */}
          {mainTab === 'screenshots' && (
            <MovieBackdropsTab
              movie={movie}
              tmdbImages={tmdbImages}
              imagesLoading={imagesLoading}
              onSetDefaultBackdrop={(path) => setDefaultBackdropMutation.mutate(path)}
              isSettingBackdrop={setDefaultBackdropMutation.isPending}
            />
          )}
        </Grid>

        {/* Right Column: Sources & Specifications */}
        <Grid item xs={12} md={4}>
          <MovieSourcesSidebar
            movie={movie}
            isResumable={isResumable}
            onOpenManageSources={() => setManageSourcesOpen(true)}
            onOpenEditModal={() => setEditModalOpen(true)}
            onPlaySource={(src) => {
              if (isDriveSource(src) || isYouTubeSource(src)) {
                openPlayer(movie, src);
              } else if (src.source_type === 'ott') {
                window.open(resolveOttUrl(src), '_blank', 'noopener,noreferrer');
              } else {
                openPlayer(movie, src);
              }
            }}
            onWatchTrailer={handleWatchTrailer}
            formatRuntime={formatRuntime}
          />
        </Grid>
      </Grid>

      {/* Similar Movies from Library */}
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

      {/* Dialogs and Modals */}
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
          if (isDriveSource(src) || isYouTubeSource(src)) {
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

      <GenreManageDialog
        open={genreDialogOpen}
        onClose={() => setGenreDialogOpen(false)}
        movie={movie}
        genresData={genresData}
        onSelectGenre={(genreId) => selectGenreMutation.mutate(genreId)}
        onCreateAndSelectGenre={(data) => createAndSelectGenreMutation.mutate(data)}
        isSelecting={selectGenreMutation.isPending}
        isCreating={createAndSelectGenreMutation.isPending}
      />

      <ConfirmDeleteModal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => {
          deleteMutation.mutate();
          setDeleteConfirmOpen(false);
        }}
        isLoading={deleteMutation.isPending}
        title="Remove Title from Library"
        description={`Are you sure you want to remove "${movie.title}" from your personal library?`}
      />

      <CastCrewModal
        open={castCrewModalOpen}
        onClose={() => setCastCrewModalOpen(false)}
        movie={movie}
        initialFilter={castModalFilter}
      />

      <FullscreenBackdropModal
        open={fullscreenBackdropOpen}
        onClose={() => setFullscreenBackdropOpen(false)}
        backdropUrl={backdropUrl}
        movieTitle={movie.title}
      />
    </Box>
  );
};
