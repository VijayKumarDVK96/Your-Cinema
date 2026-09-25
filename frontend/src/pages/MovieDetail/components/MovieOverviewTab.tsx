import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  IconButton,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TvIcon from '@mui/icons-material/Tv';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { UserMovie } from '../../../types/index.js';

export interface MovieOverviewTabProps {
  movie: UserMovie;
  posterUrl: string;
  aiExplanation: string | null;
  explaining: boolean;
  onExplainAI: () => void;
  onUpdateProgress: (updates: { current_season: number; current_episode: number }) => void;
}

export const MovieOverviewTab: React.FC<MovieOverviewTabProps> = ({
  movie,
  posterUrl,
  aiExplanation,
  explaining,
  onExplainAI,
  onUpdateProgress,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Synopsis */}
      <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 2.5 }}>
        <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 1.5 }}>
          Synopsis
        </Typography>
        <Typography variant="body1" sx={{ color: '#94A3B8', lineHeight: 1.7, mb: movie.personal_notes ? 3 : 0 }}>
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
      <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ color: '#38BDF8' }} /> Why This Movie in Your Cinema?
          </Typography>
          {!aiExplanation && (
            <Button size="small" color="secondary" onClick={onExplainAI} disabled={explaining}>
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

      {/* Seasons & Episodes Breakdown for TV Series */}
      {movie.media_type === 'tv' && movie.seasons && movie.seasons.length > 0 && (
        <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 2.5 }}>
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
                          <Chip label="Current" size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: '#7C3AED', color: '#FFF' }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.5 }}>
                        {s.episode_count || 0} Episodes • {s.air_date ? s.air_date.substring(0, 4) : 'TBD'}
                      </Typography>
                      {isCurrent && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 700 }}>
                            Progress: Ep {movie.current_episode || 1}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      )}
    </Box>
  );
};
