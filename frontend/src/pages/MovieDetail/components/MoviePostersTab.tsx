import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { UserMovie } from '../../../types/index.js';

export interface MoviePostersTabProps {
  movie: UserMovie;
  tmdbImages: any;
  imagesLoading: boolean;
  onSetDefaultPoster: (filePath: string) => void;
  isSettingPoster: boolean;
}

export const MoviePostersTab: React.FC<MoviePostersTabProps> = ({
  movie,
  tmdbImages,
  imagesLoading,
  onSetDefaultPoster,
  isSettingPoster,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
              Official Movie Posters
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              Fetch high-resolution artwork directly from TMDB API and set your default poster
            </Typography>
          </Box>
          <Chip
            label={`${tmdbImages?.posters?.length || 0} Posters Available`}
            size="small"
            sx={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontWeight: 700 }}
          />
        </Box>

        {imagesLoading ? (
          <Typography variant="body2" sx={{ color: '#94A3B8', py: 4, textAlign: 'center' }}>
            Loading high-resolution posters from TMDB...
          </Typography>
        ) : tmdbImages?.posters && tmdbImages.posters.length > 0 ? (
          <Grid container spacing={2.5}>
            {tmdbImages.posters.map((img: any, idx: number) => {
              const fullUrl = `https://image.tmdb.org/t/p/w500${img.file_path}`;
              const isCurrentPoster = movie.custom_poster_url?.includes(img.file_path) || (!movie.custom_poster_url && movie.poster_path?.includes(img.file_path));

              return (
                <Grid item xs={6} sm={4} md={3} key={img.file_path || idx}>
                  <Paper
                    sx={{
                      p: 1.5,
                      backgroundColor: '#07090E',
                      border: isCurrentPoster ? '2px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: '#38BDF8', transform: 'translateY(-2px)' },
                    }}
                  >
                    <Box
                      component="img"
                      src={fullUrl}
                      alt={`Poster ${idx + 1}`}
                      sx={{
                        width: '100%',
                        height: 260,
                        objectFit: 'cover',
                        borderRadius: 1.5,
                      }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        {img.width}x{img.height}
                      </Typography>
                      {img.iso_639_1 && (
                        <Chip
                          label={img.iso_639_1.toUpperCase()}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}
                        />
                      )}
                    </Box>

                    {isCurrentPoster ? (
                      <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        color="secondary"
                        startIcon={<CheckCircleIcon />}
                        sx={{ fontWeight: 700, textTransform: 'none', py: 0.75 }}
                      >
                        Active Poster
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        onClick={() => onSetDefaultPoster(img.file_path)}
                        disabled={isSettingPoster}
                        sx={{ fontWeight: 600, textTransform: 'none', borderColor: 'rgba(255,255,255,0.2)', color: '#F8FAFC' }}
                      >
                        Set as Default
                      </Button>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', py: 4 }}>
            No posters available for this title on TMDB.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};
