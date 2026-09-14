import React from 'react';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import InsightsIcon from '@mui/icons-material/Insights';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: { xs: 'block', md: 'none' },
        zIndex: 1200,
        backgroundColor: 'rgba(10, 13, 20, 0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
      elevation={4}
    >
      <BottomNavigation
        showLabels
        value={location.pathname}
        onChange={(_, newValue) => {
          navigate(newValue);
        }}
        sx={{
          backgroundColor: 'transparent',
          '& .Mui-selected': {
            color: '#E5A93C !important',
          },
          '& .MuiBottomNavigationAction-root': {
            color: '#64748B',
            minWidth: 'auto',
            padding: '6px 0',
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.68rem',
            fontWeight: 600,
          },
        }}
      >
        <BottomNavigationAction label="Home" value="/" icon={<HomeIcon />} />
        <BottomNavigationAction label="Movies" value="/movies" icon={<MovieFilterIcon />} />
        <BottomNavigationAction label="Picks" value="/recommendations" icon={<AutoAwesomeIcon />} />
        <BottomNavigationAction label="Lists" value="/watchlists" icon={<PlaylistPlayIcon />} />
        <BottomNavigationAction label="Taste" value="/taste" icon={<InsightsIcon />} />
      </BottomNavigation>
    </Paper>
  );
};
