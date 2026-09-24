import React, { useState, useRef } from 'react';
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
  keyframes,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CasinoIcon from '@mui/icons-material/Casino';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { SkeletonGrid } from '../../components/feedback/SkeletonGrid.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import { DiceRollTransition } from '../../components/common/DiceRollTransition.js';
import { usePlayer } from '../../context/PlayerContext.js';

const spinKeyframe = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const flashBurstKeyframe = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  30% {
    opacity: 1;
    transform: scale(1.05);
  }
  100% {
    opacity: 0;
    transform: scale(1.15);
  }
`;

export const RecommendationsPage: React.FC = () => {
  const { openPlayer } = usePlayer();
  const [activePick, setActivePick] = useState<any>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const pendingPickRef = useRef<any>(null);

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
        pendingPickRef.current = result.pick;
      }
    },
  });

  const bestMatch = data?.bestMatch || [];
  const becauseYouLoved = data?.becauseYouLoved || [];
  const hiddenGems = data?.hiddenGems || [];
  const wildCard = data?.wildCard;
  const totalEligible = data?.totalEligible || 0;

  // Trigger 3-second dice roll animation before revealing new recommendation
  const handlePickSomething = () => {
    if (isRolling || pickMutation.isPending) return;

    setIsRolling(true);
    setIsFlashing(false);
    pendingPickRef.current = null;

    // Fire API request in background
    pickMutation.mutate(undefined, {
      onSuccess: (res) => {
        if (res?.pick) {
          pendingPickRef.current = res.pick;
        }
      },
    });

    // 3 seconds rolling duration
    setTimeout(() => {
      if (pendingPickRef.current) {
        setActivePick(pendingPickRef.current);
      } else if (bestMatch.length > 0) {
        // Fallback random pick if server is still fetching
        const randomIdx = Math.floor(Math.random() * bestMatch.length);
        setActivePick(bestMatch[randomIdx]);
      }
      setIsRolling(false);
      setIsFlashing(true);

      setTimeout(() => {
        setIsFlashing(false);
      }, 500);
    }, 3000);
  };

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
          startIcon={
            <CasinoIcon
              sx={{
                animation: isRolling ? `${spinKeyframe} 0.6s linear infinite` : 'none',
              }}
            />
          }
          onClick={handlePickSomething}
          disabled={totalEligible === 0 || isRolling || pickMutation.isPending}
          sx={{ fontWeight: 700, px: 3 }}
        >
          {isRolling ? 'Rolling Dice...' : 'Pick Something For Me'}
        </Button>
      </Box>

      {/* Pick Something For Me Spotlight Card */}
      {(isRolling || activePick || (bestMatch.length > 0 && !activePick)) && (
        <Paper
          sx={{
            borderRadius: 3.5,
            backgroundColor: '#0F1523',
            border: '1px solid rgba(229, 169, 60, 0.35)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isRolling
              ? '0 0 35px rgba(229, 169, 60, 0.35), 0 20px 40px rgba(0, 0, 0, 0.7)'
              : '0 12px 32px rgba(0, 0, 0, 0.5)',
            transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
          }}
        >
          {/* Flash Burst Lens Flare Overlay on Reveal */}
          {isFlashing && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 20,
                pointerEvents: 'none',
                background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.9) 0%, rgba(229, 169, 60, 0.75) 45%, transparent 80%)',
                animation: `${flashBurstKeyframe} 0.5s ease-out forwards`,
              }}
            />
          )}

          {isRolling ? (
            <DiceRollTransition duration={3000} />
          ) : (
            (() => {
              const featured = activePick || bestMatch[0];
              if (!featured) return null;
              const m = featured.movie;

              return (
                <Box
                  component={motion.div}
                  key={m.movie_id || m.id || activePick?.movie?.movie_id}
                  initial={{ opacity: 0, scale: 0.94, y: 15, filter: 'brightness(1.5)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'brightness(1)' }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  sx={{ p: { xs: 2.5, md: 4 } }}
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
                        sx={{
                          width: '100%',
                          borderRadius: 2.5,
                          maxHeight: 320,
                          objectFit: 'cover',
                          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(229, 169, 60, 0.2)',
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={8} md={9}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                        <Chip
                          icon={<AutoAwesomeIcon sx={{ color: '#E5A93C !important' }} />}
                          label={`${featured.score}% TASTE MATCH`}
                          size="small"
                          sx={{
                            backgroundColor: 'rgba(229, 169, 60, 0.18)',
                            color: '#E5A93C',
                            fontWeight: 700,
                            border: '1px solid rgba(229, 169, 60, 0.4)',
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          From your {totalEligible} unwatched films
                        </Typography>
                      </Box>

                      <Typography variant="h3" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 1 }}>
                        {m.title}
                      </Typography>

                      <Typography
                        variant="body1"
                        sx={{
                          color: '#94A3B8',
                          mb: 2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {m.overview}
                      </Typography>

                      {/* Why this was selected */}
                      <Box sx={{ mb: 2.5, p: 2, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <Typography variant="subtitle2" sx={{ color: '#38BDF8', fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <InfoOutlinedIcon fontSize="small" /> Why This Movie?
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {(featured.reasons || []).map((r: string, idx: number) => (
                            <Chip key={idx} label={r} size="small" sx={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#BAE6FD', fontSize: '0.75rem', border: '1px solid rgba(56, 189, 248, 0.25)' }} />
                          ))}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
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
                          startIcon={
                            <CasinoIcon
                              sx={{
                                animation: isRolling ? `${spinKeyframe} 0.6s linear infinite` : 'none',
                              }}
                            />
                          }
                          onClick={handlePickSomething}
                          disabled={isRolling || pickMutation.isPending}
                          sx={{
                            borderColor: 'rgba(255, 255, 255, 0.2)',
                            '&:hover': {
                              borderColor: '#E5A93C',
                              backgroundColor: 'rgba(229, 169, 60, 0.08)',
                            },
                          }}
                        >
                          {isRolling ? 'Rolling...' : 'Another Pick'}
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              );
            })()
          )}
        </Paper>
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
