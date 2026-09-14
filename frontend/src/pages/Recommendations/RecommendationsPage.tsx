import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Paper,
  Chip,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CasinoIcon from '@mui/icons-material/Casino';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { SkeletonGrid } from '../../components/feedback/SkeletonGrid.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import { usePlayer } from '../../context/PlayerContext.js';

export const RecommendationsPage: React.FC = () => {
  const { openPlayer } = usePlayer();
  const [activePick, setActivePick] = useState<any>(null);

  // Fetch Recommendations (strictly user-owned candidates)
  const { data, isLoading } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      const res = await api.get('/recommendations');
      return res.data?.data;
    },
  });

  // Pick Something For Me Mutation
  const pickMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/recommendations/pick');
      return res.data?.data;
    },
    onSuccess: (result) => {
      if (result?.pick) {
        setActivePick(result.pick);
      }
    },
  });

  const bestMatch = data?.bestMatch || [];
  const becauseYouLoved = data?.becauseYouLoved || [];
  const hiddenGems = data?.hiddenGems || [];
  const wildCard = data?.wildCard;
  const totalEligible = data?.totalEligible || 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
            Library Taste Engine
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>
            Recommendations derived strictly from your {totalEligible} unwatched movies using personal ratings and tags.
          </Typography>
        </Box>

        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<CasinoIcon />}
          onClick={() => pickMutation.mutate()}
          disabled={totalEligible === 0 || pickMutation.isPending}
          sx={{ fontWeight: 700, px: 3 }}
        >
          {pickMutation.isPending ? 'Picking...' : 'Pick Something For Me'}
        </Button>
      </Box>

      {/* Pick Something For Me Spotlight (When clicked or auto-selected) */}
      {(activePick || (bestMatch.length > 0 && !activePick)) && (
        (() => {
          const featured = activePick || bestMatch[0];
          const m = featured.movie;
          return (
            <Paper
              sx={{
                p: { xs: 2.5, md: 4 },
                borderRadius: 3.5,
                backgroundColor: '#0F1523',
                border: '1px solid rgba(229, 169, 60, 0.3)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} sm={4} md={3}>
                  <Box
                    component="img"
                    src={
                      m.poster_path
                        ? (m.poster_path.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w500${m.poster_path}`)
                        : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80'
                    }
                    alt={m.title}
                    sx={{ width: '100%', borderRadius: 2, maxHeight: 320, objectFit: 'cover' }}
                  />
                </Grid>

                <Grid item xs={12} sm={8} md={9}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Chip
                      icon={<AutoAwesomeIcon sx={{ color: '#E5A93C !important' }} />}
                      label={`${featured.score}% TASTE MATCH`}
                      size="small"
                      sx={{ backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C', fontWeight: 700 }}
                    />
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      From your {totalEligible} unwatched films
                    </Typography>
                  </Box>

                  <Typography variant="h3" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 1 }}>
                    {m.title}
                  </Typography>

                  <Typography variant="body1" sx={{ color: '#94A3B8', mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.overview}
                  </Typography>

                  {/* Why this was selected */}
                  <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                    <Typography variant="subtitle2" sx={{ color: '#38BDF8', fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <InfoOutlinedIcon fontSize="small" /> Why This Movie?
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {featured.reasons.map((r: string, idx: number) => (
                        <Chip key={idx} label={r} size="small" sx={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#BAE6FD', fontSize: '0.75rem' }} />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PlayArrowIcon />}
                      onClick={() => openPlayer(m)}
                      sx={{ fontWeight: 700, px: 3 }}
                    >
                      Play Now
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      onClick={() => pickMutation.mutate()}
                      disabled={pickMutation.isPending}
                    >
                      Another Pick
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          );
        })()
      )}

      {/* Shelf 1: Best Match */}
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC', mb: 0.5 }}>
          Best Overall Taste Matches
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
          Highest affinity scores computed across your preferred genres, directors, and ratings
        </Typography>

        {isLoading ? (
          <SkeletonGrid count={6} />
        ) : bestMatch.length > 0 ? (
          <Grid container spacing={2.5}>
            {bestMatch.map((item: any) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={item.movie.user_movie_id}>
                <MovieCard movie={item.movie} recommendationScore={item.score} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <EmptyState
            icon={<AutoAwesomeIcon />}
            title="Unlock Recommendations"
            description="Add more unwatched movies and rate films in your library to power the recommendation engine."
          />
        )}
      </Box>

      {/* Shelf 2: Because You Loved [Movie] */}
      {becauseYouLoved.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC', mb: 0.5 }}>
            Because You Loved "{data.referenceMovieTitle}"
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
            Unwatched movies in your collection sharing director, genre DNA, and tone
          </Typography>
          <Grid container spacing={2.5}>
            {becauseYouLoved.map((item: any) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={item.movie.user_movie_id}>
                <MovieCard movie={item.movie} recommendationScore={item.score} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Shelf 3: Hidden Gems & Wild Card */}
      <Grid container spacing={3}>
        {hiddenGems.length > 0 && (
          <Grid item xs={12} md={wildCard ? 8 : 12}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC', mb: 0.5 }}>
              Hidden Gems in Your Sanctuary
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
              High-quality unwatched films that you might have forgotten you added
            </Typography>
            <Grid container spacing={2}>
              {hiddenGems.slice(0, 4).map((item: any) => (
                <Grid item xs={6} sm={3} key={item.movie.user_movie_id}>
                  <MovieCard movie={item.movie} recommendationScore={item.score} />
                </Grid>
              ))}
            </Grid>
          </Grid>
        )}

        {wildCard && (
          <Grid item xs={12} md={4}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC', mb: 0.5 }}>
              Wild Card
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
              Intentionally outside your routine
            </Typography>
            <Card sx={{ backgroundColor: '#0F1523', border: '1px solid rgba(229,169,60,0.3)', p: 2 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box
                  component="img"
                  src={
                    wildCard.movie.poster_path
                      ? (wildCard.movie.poster_path.startsWith('http') ? wildCard.movie.poster_path : `https://image.tmdb.org/t/p/w300${wildCard.movie.poster_path}`)
                      : ''
                  }
                  alt={wildCard.movie.title}
                  sx={{ width: 80, height: 120, borderRadius: 1.5, objectFit: 'cover' }}
                />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '1rem' }}>
                    {wildCard.movie.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1 }}>
                    {wildCard.movie.release_date?.substring(0, 4)} • {wildCard.movie.director}
                  </Typography>
                  <Chip label="Surprise Choice" size="small" sx={{ backgroundColor: 'rgba(56,189,248,0.2)', color: '#38BDF8', mb: 1 }} />
                  <Button size="small" variant="contained" color="primary" onClick={() => openPlayer(wildCard.movie)}>
                    Play
                  </Button>
                </Box>
              </Box>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
