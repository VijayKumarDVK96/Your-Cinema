import React from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InsightsIcon from '@mui/icons-material/Insights';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLocation, useNavigate } from 'react-router-dom';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Home', path: '/', icon: <HomeIcon /> },
    { label: 'My Movies', path: '/movies', icon: <MovieFilterIcon /> },
    { label: 'Watchlists', path: '/watchlists', icon: <PlaylistPlayIcon /> },
    { label: 'Recommendations', path: '/recommendations', icon: <AutoAwesomeIcon /> },
    { label: 'My Taste DNA', path: '/taste', icon: <InsightsIcon /> },
    { label: 'Import Center', path: '/import', icon: <CloudUploadIcon /> },
  ];

  return (
    <Box
      sx={{
        width: 240,
        flexShrink: 0,
        backgroundColor: '#07090E',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'space-between',
        py: 2,
        height: '100%',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        minHeight: 'calc(100vh - 65px)',
        overflowY: 'auto',
      }}
    >
      <List sx={{ px: 1.5 }}>
        <Typography variant="overline" sx={{ px: 2, color: '#64748B', fontWeight: 700, letterSpacing: '0.12em' }}>
          COLLECTION
        </Typography>

        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                py: 1.2,
                px: 2,
                backgroundColor: active ? 'rgba(229, 169, 60, 0.12)' : 'transparent',
                borderLeft: active ? '3px solid #E5A93C' : '3px solid transparent',
                '&:hover': {
                  backgroundColor: active ? 'rgba(229, 169, 60, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: active ? '#E5A93C' : '#94A3B8' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.9rem',
                  color: active ? '#F8FAFC' : '#94A3B8',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ px: 1.5 }}>
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)', mb: 1.5 }} />
        <ListItemButton
          onClick={() => navigate('/settings')}
          sx={{
            borderRadius: 2,
            py: 1,
            px: 2,
            backgroundColor: location.pathname === '/settings' ? 'rgba(229, 169, 60, 0.12)' : 'transparent',
          }}
        >
          <ListItemIcon sx={{ minWidth: 38, color: location.pathname === '/settings' ? '#E5A93C' : '#64748B' }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText
            primary="Settings"
            primaryTypographyProps={{
              fontWeight: 500,
              fontSize: '0.88rem',
              color: location.pathname === '/settings' ? '#F8FAFC' : '#94A3B8',
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );
};
