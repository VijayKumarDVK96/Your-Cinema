import React from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  Paper,
  Stack,
  LinearProgress,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { SkeletonGrid } from '../../components/feedback/SkeletonGrid.js';
import { usePlayer } from '../../context/PlayerContext.js';
import { useAuth } from '../../context/AuthContext.js';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openPlayer } = usePlayer();

  // Dynamic time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Fetch Library Movies
  const { data: moviesData, isLoading: moviesLoading } = useQuery({
    queryKey: ['my-movies', 'home'],
    queryFn: async () => {
      const res = await api.get('/movies?limit=50');
      return res.data?.data;
    },
  });

  // Fetch Recommendations (strictly user-owned)
  const { data: recsData, isLoading: recsLoading } = useQuery({
    queryKey: ['recommendations', 'home'],
    queryFn: async () => {
      const res = await api.get('/recommendations');
      return res.data?.data;
    },
  });

  // Fetch Taste Profile for summary statistics
  const { data: tasteData } = useQuery({
    queryKey: ['taste-profile', 'home'],
    queryFn: async () => {
      const res = await api.get('/taste');
      return res.data?.data;
    },
  });

  const allMovies = moviesData?.movies || [];
  const unwatched = allMovies.filter((m: any) => m.watch_status === 'unwatched');
  const watching = allMovies.filter((m: any) => m.watch_status === 'watching');
  const watched = allMovies.filter((m: any) => m.watch_status === 'watched');

  // Currently watching candidate for resume hero
  const continueWatchingMovie = watching.length > 0 ? watching[0] : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Personalized Greeting & Library Stats Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 0.5 }}>
            {getGreeting()}, {user?.name || 'Collector'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              Your Personal Sanctuary:
            </Typography>
            <Chip
              icon={<LocalMoviesIcon sx={{ color: '#E5A93C !important', fontSize: 16 }} />}
              label={`${allMovies.length} Movies`}
              size="small"
              sx={{ backgroundColor: '#131926', color: '#E5A93C', fontWeight: 600 }}
            />
            <Chip
              icon={<VisibilityOutlinedIcon sx={{ color: '#38BDF8 !important', fontSize: 16 }} />}
              label={`${unwatched.length} Unwatched`}
              size="small"
              sx={{ backgroundColor: '#131926', color: '#38BDF8', fontWeight: 600 }}
            />
            <Chip
              icon={<CheckCircleOutlineIcon sx={{ color: '#10B981 !important', fontSize: 16 }} />}
              label={`${watched.length} Watched`}
              size="small"
              sx={{ backgroundColor: '#131926', color: '#10B981', fontWeight: 600 }}
            />
          </Box>
        </Box>

        {/* Quick Pick Action */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<AutoAwesomeIcon />}
          onClick={() => navigate('/recommendations')}
          sx={{ fontWeight: 700, px: 3, py: 1.2 }}
        >
          Pick Something For Me
        </Button>
      </Box>

      {/* Continue Watching Spotlight (If user has an active paused movie) */}
      {continueWatchingMovie && (
        <Paper
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 3,
            backgroundColor: '#0F1523',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            backgroundImage: continueWatchingMovie.backdrop_path
              ? `linear-gradient(to right, #0F1523 35%, rgba(15, 21, 35, 0.85) 60%, rgba(15, 21, 35, 0.4)), url(${
                  continueWatchingMovie.backdrop_path.startsWith('http')
                    ? continueWatchingMovie.backdrop_path
                    : `https://image.tmdb.org/t/p/w1280${continueWatchingMovie.backdrop_path}`
                })`
              : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Box sx={{ maxWidth: 600 }}>
            <Chip
              label="CONTINUE WATCHING"
              size="small"
              sx={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8', fontWeight: 700, mb: 1.5 }}
            />
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 1 }}>
              {continueWatchingMovie.title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {continueWatchingMovie.overview}
            </Typography>

            {/* Resume Progress Bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(
                  Math.round(((continueWatchingMovie.playback_position_sec || 0) / ((continueWatchingMovie.runtime || 120) * 60)) * 100),
                  95
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
                {Math.floor((continueWatchingMovie.playback_position_sec || 0) / 60)}m watched
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<PlayArrowIcon />}
              onClick={() => openPlayer(continueWatchingMovie)}
              sx={{ fontWeight: 700, px: 3, py: 1 }}
            >
              Resume Playback
            </Button>
          </Box>
        </Paper>
      )}

      {/* Rail 1: Recommended From Your Library */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
              Top Matches From Your Library
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Ranked exclusively from your unwatched films based on your taste signals
            </Typography>
          </Box>
          <Button color="primary" onClick={() => navigate('/recommendations')} sx={{ fontWeight: 600 }}>
            View All
          </Button>
        </Box>

        {recsLoading ? (
          <SkeletonGrid count={6} />
        ) : recsData?.bestMatch && recsData.bestMatch.length > 0 ? (
          <Grid container spacing={2}>
            {recsData.bestMatch.slice(0, 6).map((item: any) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={item.movie.user_movie_id}>
                <MovieCard movie={item.movie} recommendationScore={item.score} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Add unwatched movies to your library to generate tailored matches.
          </Typography>
        )}
      </Box>

      {/* Rail 2: Because You Loved [Movie] */}
      {recsData?.becauseYouLoved && recsData.becauseYouLoved.length > 0 && (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
              Because You Loved "{recsData.referenceMovieTitle}"
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Unwatched movies in your collection sharing thematic DNA and craftsmanship
            </Typography>
          </Box>
          <Grid container spacing={2}>
            {recsData.becauseYouLoved.slice(0, 6).map((item: any) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={item.movie.user_movie_id}>
                <MovieCard movie={item.movie} recommendationScore={item.score} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Rail 3: Recently Added to Your Cinema */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
            Recently Added to Library
          </Typography>
          <Button color="primary" onClick={() => navigate('/movies')} sx={{ fontWeight: 600 }}>
            Browse My Movies
          </Button>
        </Box>

        {moviesLoading ? (
          <SkeletonGrid count={6} />
        ) : allMovies.length > 0 ? (
          <Grid container spacing={2}>
            {allMovies.slice(0, 6).map((movie: any) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={movie.user_movie_id}>
                <MovieCard movie={movie} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            No movies in your sanctuary yet. Click "Add Movie" above or use the Import Center!
          </Typography>
        )}
      </Box>
    </Box>
  );
};
