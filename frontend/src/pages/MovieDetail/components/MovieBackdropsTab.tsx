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
import StarIcon from '@mui/icons-material/Star';
import { UserMovie } from '../../../types/index.js';

export interface MovieBackdropsTabProps {
  movie: UserMovie;
  tmdbImages: any;
  imagesLoading: boolean;
  onSetDefaultBackdrop: (filePath: string) => void;
  isSettingBackdrop: boolean;
}

export const MovieBackdropsTab: React.FC<MovieBackdropsTabProps> = ({
  movie,
  tmdbImages,
  imagesLoading,
  onSetDefaultBackdrop,
  isSettingBackdrop,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
              Screenshots & Backdrop Gallery
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              Set high-resolution keyframes or backdrops as your movie's main hero banner image
            </Typography>
          </Box>
          <Chip
            label={`${tmdbImages?.backdrops?.length || 0} Screenshots Available`}
            size="small"
            sx={{ backgroundColor: 'rgba(167, 139, 250, 0.15)', color: '#A78BFA', fontWeight: 700 }}
          />
        </Box>

        {imagesLoading ? (
          <Typography variant="body2" sx={{ color: '#94A3B8', py: 4, textAlign: 'center' }}>
            Loading high-resolution backdrops from TMDB...
          </Typography>
        ) : tmdbImages?.backdrops && tmdbImages.backdrops.length > 0 ? (
          <Grid container spacing={2.5}>
            {tmdbImages.backdrops.map((img: any, idx: number) => {
              const fullUrl = `https://image.tmdb.org/t/p/w780${img.file_path}`;
              const isCurrentBackdrop = movie.custom_backdrop_url?.includes(img.file_path) || (!movie.custom_backdrop_url && movie.backdrop_path?.includes(img.file_path));

              return (
                <Grid item xs={12} sm={6} md={4} key={img.file_path || idx}>
                  <Paper
                    sx={{
                      p: 1.5,
                      backgroundColor: '#07090E',
                      border: isCurrentBackdrop ? '2px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: '#A78BFA', transform: 'translateY(-2px)' },
                    }}
                  >
                    <Box
                      component="img"
                      src={fullUrl}
                      alt={`Backdrop ${idx + 1}`}
                      sx={{
                        width: '100%',
                        height: 180,
                        objectFit: 'cover',
                        borderRadius: 1.5,
                      }}
                    />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        {img.width}x{img.height}
                      </Typography>

                      {img.vote_average ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <StarIcon sx={{ fontSize: 14, color: '#E5A93C' }} />
                          <Typography variant="caption" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                            {img.vote_average.toFixed(1)}
                          </Typography>
                        </Box>
                      ) : null}
                    </Box>

                    {isCurrentBackdrop ? (
                      <Button
                        fullWidth
                        size="small"
                        variant="contained"
                        color="secondary"
                        startIcon={<CheckCircleIcon />}
                        sx={{ fontWeight: 700, textTransform: 'none', py: 0.75 }}
                      >
                        Active Backdrop
                      </Button>
                    ) : (
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        onClick={() => onSetDefaultBackdrop(img.file_path)}
                        disabled={isSettingBackdrop}
                        sx={{ fontWeight: 600, textTransform: 'none', borderColor: 'rgba(255,255,255,0.2)', color: '#F8FAFC' }}
                      >
                        Set as Default Backdrop
                      </Button>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', py: 4 }}>
            No screenshots or backdrops available for this title on TMDB.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};
