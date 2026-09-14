import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  LinearProgress,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import StarIcon from '@mui/icons-material/Star';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
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

  const { summary, movieDna = [], topDirectors = [], runtimeBuckets = {} } = data;

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

      {/* Movie DNA (Genre Breakdown) */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 0.5 }}>
              Movie DNA — Genre Distribution
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

        {/* Top Directors & Runtime Preference */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 0.5 }}>
              Top Directors in Sanctuary
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
              Filmmakers with highest frequency in your library
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 4 }}>
              {topDirectors.map((d: any) => (
                <Box
                  key={d.name}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                    {d.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={`${d.movieCount} films`} size="small" sx={{ backgroundColor: 'rgba(56,189,248,0.15)', color: '#38BDF8' }} />
                    {d.avgRating && (
                      <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 700 }}>
                        {d.avgRating} ★
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>

            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 1 }}>
              Preferred Runtime Sweet Spot
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label={`< 90m: ${runtimeBuckets.under90 || 0} films`} sx={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8' }} />
              <Chip label={`90-120m: ${runtimeBuckets.between90and120 || 0} films`} sx={{ backgroundColor: 'rgba(229,169,60,0.15)', color: '#E5A93C', fontWeight: 600 }} />
              <Chip label={`120-150m: ${runtimeBuckets.between120and150 || 0} films`} sx={{ backgroundColor: 'rgba(56,189,248,0.15)', color: '#38BDF8', fontWeight: 600 }} />
              <Chip label={`150m+: ${runtimeBuckets.over150 || 0} films`} sx={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8' }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
