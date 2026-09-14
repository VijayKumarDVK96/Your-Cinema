import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  InputBase,
  Button,
  IconButton,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import TvIcon from '@mui/icons-material/Tv';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useTVNavigation } from '../../context/TVNavigationContext.js';

interface NavbarProps {
  onOpenAddMovie: () => void;
  onSearchChange?: (term: string) => void;
  searchTerm?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddMovie,
  onSearchChange,
  searchTerm = '',
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isTvMode, toggleTvMode } = useTVNavigation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleProfileClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleCloseMenu();
    await logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: 'rgba(7, 9, 14, 0.92)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 1100,
        boxShadow: 'none',
      }}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', px: { xs: 2, md: 3 }, py: 1 }}>
        {/* Brand */}
        <Box
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', gap: 1.2, cursor: 'pointer' }}
        >
          <LocalMoviesIcon sx={{ color: '#E5A93C', fontSize: 30 }} />
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"Outfit", sans-serif',
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#F8FAFC',
                lineHeight: 1.1,
                fontSize: { xs: '1rem', md: '1.2rem' },
              }}
            >
              YOUR CINEMA
            </Typography>
            <Typography variant="caption" sx={{ color: '#E5A93C', fontSize: '0.62rem', letterSpacing: '0.15em', fontWeight: 600 }}>
              PERSONAL SANCTUARY
            </Typography>
          </Box>
        </Box>

        {/* Search My Movies (Strictly within User's Library) */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            px: 2,
            py: 0.5,
            width: { md: 280, lg: 380 },
            transition: 'all 0.2s',
            '&:focus-within': {
              borderColor: '#E5A93C',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              boxShadow: '0 0 10px rgba(229, 169, 60, 0.2)',
            },
          }}
        >
          <SearchIcon sx={{ color: '#64748B', mr: 1, fontSize: 20 }} />
          <InputBase
            placeholder="Search My Movies (title, director, tags)..."
            value={searchTerm}
            onChange={(e) => {
              if (onSearchChange) onSearchChange(e.target.value);
            }}
            sx={{ color: '#F8FAFC', fontSize: '0.88rem', width: '100%' }}
          />
        </Box>

        {/* Action Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Add Movie (TMDB Import) Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={onOpenAddMovie}
            sx={{
              fontWeight: 700,
              fontSize: { xs: '0.78rem', md: '0.85rem' },
              px: { xs: 1.5, md: 2 },
            }}
          >
            Add Movie
          </Button>

          {/* Import Center Link */}
          <Tooltip title="Bulk Watchlist & Media Importer">
            <IconButton
              onClick={() => navigate('/import')}
              sx={{ color: '#94A3B8', '&:hover': { color: '#E5A93C' } }}
            >
              <CloudUploadIcon />
            </IconButton>
          </Tooltip>

          {/* Android TV Mode Toggle */}
          <Tooltip title={isTvMode ? 'Disable TV Navigation Mode' : 'Enable Android TV / D-Pad Mode'}>
            <IconButton
              onClick={toggleTvMode}
              sx={{
                color: isTvMode ? '#38BDF8' : '#94A3B8',
                backgroundColor: isTvMode ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                '&:hover': { color: '#38BDF8' },
              }}
            >
              <TvIcon />
            </IconButton>
          </Tooltip>

          {/* User Profile / Menu */}
          <IconButton onClick={handleProfileClick} sx={{ p: 0.5 }}>
            <Avatar
              alt={user?.name || 'User'}
              src={user?.avatar_url || undefined}
              sx={{ width: 34, height: 34, bgcolor: '#E5A93C', color: '#000', fontWeight: 700, fontSize: '0.9rem' }}
            >
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            PaperProps={{
              sx: {
                backgroundColor: '#0F141F',
                border: '1px solid rgba(255,255,255,0.1)',
                minWidth: 180,
                mt: 1,
              },
            }}
          >
            <MenuItem onClick={() => { handleCloseMenu(); navigate('/settings'); }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" sx={{ color: '#94A3B8' }} />
              </ListItemIcon>
              Settings & Taste
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: '#EF4444' }} />
              </ListItemIcon>
              <Typography sx={{ color: '#EF4444' }}>Sign Out</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
