import React, { useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import TvIcon from '@mui/icons-material/Tv';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { SkeletonGrid } from '../../components/feedback/SkeletonGrid.js';
import { useAuth } from '../../context/AuthContext.js';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const continueWatchingRef = useRef<HTMLDivElement>(null);

  const scrollContinueWatching = (direction: 'left' | 'right') => {
    if (continueWatchingRef.current) {
      const scrollAmount = direction === 'left' ? -480 : 480;
      continueWatchingRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Dynamic time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Fetch Library Stats (Total, Movies, Web Series, Watched, Unwatched, etc.)
  const { data: statsData } = useQuery({
    queryKey: ['movies', 'stats'],
    queryFn: async () => {
      const res = await api.get('/movies/stats');
      return res.data?.data;
    },
  });

  const stats = statsData || {
    total: 0,
    movies: 0,
    series: 0,
    unwatched: 0,
    watching: 0,
    watched: 0,
    favorites: 0,
  };

  // Fetch Watching Titles for Continue Watching Carousel
  const { data: watchingData } = useQuery({
    queryKey: ['movies', 'watching', 'home'],
    queryFn: async () => {
      const res = await api.get('/movies?status=watching&limit=50');
      return res.data?.data;
    },
  });

  // Fetch Recently Added Library Titles
  const { data: moviesData, isLoading: moviesLoading } = useQuery({
    queryKey: ['movies', 'recently-added', 'home'],
    queryFn: async () => {
      const res = await api.get('/movies?limit=20&sortBy=added_at');
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
  const watchingList = watchingData?.movies || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Personalized Greeting & Library Stats Header */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 0.5 }}>
            {getGreeting()}, {user?.name || 'Collector'}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              Your Personal Sanctuary:
            </Typography>
            <Chip
              icon={<LocalMoviesIcon sx={{ color: '#E5A93C !important', fontSize: 16 }} />}
              label={`${stats.movies} Movies`}
              size="small"
              sx={{ backgroundColor: '#131926', color: '#E5A93C', fontWeight: 600 }}
            />
            <Chip
              icon={<TvIcon sx={{ color: '#A855F7 !important', fontSize: 16 }} />}
              label={`${stats.series} Web Series`}
              size="small"
              sx={{ backgroundColor: '#131926', color: '#A855F7', fontWeight: 600 }}
            />
            <Chip
              icon={<VisibilityOutlinedIcon sx={{ color: '#38BDF8 !important', fontSize: 16 }} />}
              label={`${stats.unwatched} Unwatched`}
              size="small"
              sx={{ backgroundColor: '#131926', color: '#38BDF8', fontWeight: 600 }}
            />
            <Chip
              icon={<CheckCircleOutlineIcon sx={{ color: '#10B981 !important', fontSize: 16 }} />}
              label={`${stats.watched} Watched`}
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

      {/* Rail: Continue Watching Carousel */}
      {watchingList.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                Continue Watching
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Pick up where you left off across your active titles
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                size="small"
                onClick={() => scrollContinueWatching('left')}
                sx={{
                  color: '#94A3B8',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover': { color: '#F8FAFC', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => scrollContinueWatching('right')}
                sx={{
                  color: '#94A3B8',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  '&:hover': { color: '#F8FAFC', backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>
          </Box>
          <Box
            ref={continueWatchingRef}
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              pb: 2,
              pt: 0.5,
              px: 0.5,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 3 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 3, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.25)' } },
            }}
          >
            {watchingList.map((m: any) => (
              <Box
                key={m.user_movie_id}
                sx={{
                  flex: '0 0 auto',
                  width: { xs: 155, sm: 180, md: 200, lg: 215 },
                }}
              >
                <MovieCard movie={m} />
              </Box>
            ))}
          </Box>
        </Box>
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
