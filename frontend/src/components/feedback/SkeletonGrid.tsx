import React from 'react';
import { Grid, Box, Skeleton } from '@mui/material';

export const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 12 }) => {
  return (
    <Grid container spacing={2.5}>
      {Array.from({ length: count }).map((_, idx) => (
        <Grid item xs={6} sm={4} md={3} lg={2} key={idx}>
          <Box sx={{ borderRadius: 2.5, overflow: 'hidden', backgroundColor: '#0E131F' }}>
            <Skeleton variant="rectangular" height={260} animation="wave" sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
            <Box sx={{ p: 1.5 }}>
              <Skeleton variant="text" width="80%" height={20} animation="wave" sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
              <Skeleton variant="text" width="40%" height={16} animation="wave" sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)' }} />
            </Box>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
};
