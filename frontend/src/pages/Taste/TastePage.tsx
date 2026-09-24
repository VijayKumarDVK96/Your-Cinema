import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  LinearProgress,
  Chip,
  Button,
  Avatar,
  Divider,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StarIcon from '@mui/icons-material/Star';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import PersonIcon from '@mui/icons-material/Person';
import FaceIcon from '@mui/icons-material/Face';
import TheaterComedyIcon from '@mui/icons-material/TheaterComedy';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export const TastePage: React.FC = () => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Fetch Taste Profile
  const { data, isLoading } = useQuery({
    queryKey: ['taste-profile'],
    queryFn: async () => {
      const res = await api.get('/taste');
      return res.data?.data;
    },
  });

  const handleGenerateAI = async () => {
    setGeneratingAi(true);
    try {
      const res = await api.post('/ai/taste-summary');
      setAiSummary(res.data?.data?.summary);
    } catch {
      setAiSummary('You gravitate toward high-concept, atmospheric films with rigorous craftsmanship and multi-layered narratives.');
    } finally {
      setGeneratingAi(false);
    }
  };

  if (isLoading || !data) {
    return <Box sx={{ py: 8, textAlign: 'center', color: '#94A3B8' }}>Calculating your Movie DNA...</Box>;
  }

  const {
    summary,
    movieDna = [],
    topDirectors = [],
    topActors = [],
    topActresses = [],
    runtimeBuckets = {},
  } = data;

  const renderPersonList = (
    items: any[],
    accentColor: string,
    emptyMessage: string
  ) => {
    if (!items || items.length === 0) {
      return (
        <Typography variant="body2" sx={{ color: '#64748B', py: 3, textAlign: 'center' }}>
          {emptyMessage}
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {items.map((person: any) => (
          <Box
            key={person.name}
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderColor: `${accentColor}44`,
                transform: 'translateX(3px)',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <Avatar
                src={person.profile_path || undefined}
                alt={person.name}
                sx={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${accentColor}66`,
                  color: accentColor,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {person.name ? person.name.charAt(0) : '?'}
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {person.name}
                </Typography>
                {person.roles && person.roles.length > 0 && (
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    as {person.roles[0]}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <Chip
                label={`${person.movieCount} ${person.movieCount === 1 ? 'film' : 'films'}`}
                size="small"
                sx={{
                  backgroundColor: `${accentColor}18`,
                  color: accentColor,
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  border: `1px solid ${accentColor}33`,
                }}
              />
              {person.avgRating && (
                <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 800, minWidth: 38, textAlign: 'right' }}>
                  {person.avgRating} ★
                </Typography>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 0.5 }}>
          My Taste Profile & Movie DNA
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
          Visual analytics representing your personal viewing habits, aesthetic inclinations, and rated films
        </Typography>
      </Box>

      {/* Summary KPI Cards */}
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>MOVIES WATCHED</Typography>
            <Typography variant="h4" sx={{ color: '#F8FAFC', fontWeight: 800, mt: 0.5 }}>
              {summary.watchedCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>of {summary.totalMovies} in library</Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>AVERAGE RATING</Typography>
            <Typography variant="h4" sx={{ color: '#E5A93C', fontWeight: 800, mt: 0.5 }}>
              {summary.averageRating != null && !isNaN(Number(summary.averageRating)) ? `${Number(summary.averageRating).toFixed(1)} ★` : '-'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>from personal scores</Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>HOURS WATCHED</Typography>
            <Typography variant="h4" sx={{ color: '#38BDF8', fontWeight: 800, mt: 0.5 }}>
              {summary.totalHoursWatched}h
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>total runtime logged</Typography>
          </Paper>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>FAVORITES LOGGED</Typography>
            <Typography variant="h4" sx={{ color: '#EF4444', fontWeight: 800, mt: 0.5 }}>
              {summary.favoritesCount}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>top-tier films</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* AI Taste Narrative Banner */}
      <Paper
        sx={{
          p: 3.5,
          borderRadius: 3,
          backgroundColor: '#0F1523',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ color: '#38BDF8' }} /> Cinematic Taste Narrative
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="secondary"
            onClick={handleGenerateAI}
            disabled={generatingAi}
          >
            {generatingAi ? 'Generating...' : aiSummary ? 'Regenerate Narrative' : 'Generate AI Summary'}
          </Button>
        </Box>
        <Typography variant="body1" sx={{ color: '#94A3B8', lineHeight: 1.7 }}>
          {aiSummary ||
            "You display a distinct gravitation toward intellectual narratives with complex world-building and atmospheric pacing. Your ratings demonstrate an appreciation for director-driven vision and immersive cinematography."}
        </Typography>
      </Paper>

      {/* Movie DNA & Preferred Runtime */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', height: '100%' }}>
            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <InsightsIcon sx={{ color: '#E5A93C' }} /> Movie DNA — Genre Distribution
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 3 }}>
              Relative density of narrative genres comprising your personal cinema
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {movieDna.map((item: any) => (
                <Box key={item.name}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 700 }}>
                      {item.count} films ({item.percentage}%)
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.percentage}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#E5A93C',
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon sx={{ color: '#38BDF8' }} /> Preferred Runtime Sweet Spot
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 3 }}>
                Distribution of film lengths in your sanctuary
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#94A3B8' }}>Short Features (&lt; 90 min)</Typography>
                  <Chip label={`${runtimeBuckets.under90 || 0} films`} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#94A3B8' }} />
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(229, 169, 60, 0.05)', border: '1px solid rgba(229, 169, 60, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#E5A93C', fontWeight: 600 }}>Standard Length (90–120 min)</Typography>
                  <Chip label={`${runtimeBuckets.between90and120 || 0} films`} size="small" sx={{ backgroundColor: 'rgba(229,169,60,0.18)', color: '#E5A93C', fontWeight: 700 }} />
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#38BDF8', fontWeight: 600 }}>Epic Narratives (120–150 min)</Typography>
                  <Chip label={`${runtimeBuckets.between120and150 || 0} films`} size="small" sx={{ backgroundColor: 'rgba(56,189,248,0.18)', color: '#38BDF8', fontWeight: 700 }} />
                </Box>
                <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#94A3B8' }}>Grand Epics (150+ min)</Typography>
                  <Chip label={`${runtimeBuckets.over150 || 0} films`} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#94A3B8' }} />
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Top Directors, Top Actors & Top Actresses in Sanctuary */}
      <Grid container spacing={3}>
        {/* Top Directors */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', height: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MovieFilterIcon sx={{ color: '#E5A93C' }} /> Top Directors in Sanctuary
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                Filmmakers with highest frequency in your library
              </Typography>
            </Box>
            {renderPersonList(topDirectors, '#E5A93C', 'No director data logged yet.')}
          </Paper>
        </Grid>

        {/* Top Actors */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', height: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TheaterComedyIcon sx={{ color: '#38BDF8' }} /> Top Actors in Sanctuary
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                Leading male performers across your collection
              </Typography>
            </Box>
            {renderPersonList(topActors, '#38BDF8', 'No actor data logged yet.')}
          </Paper>
        </Grid>

        {/* Top Actresses */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', height: '100%' }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FaceIcon sx={{ color: '#F472B6' }} /> Top Actresses in Sanctuary
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                Leading female performers across your collection
              </Typography>
            </Box>
            {renderPersonList(topActresses, '#F472B6', 'No actress data logged yet.')}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
