import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import InsightsIcon from '@mui/icons-material/Insights';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AddIcon from '@mui/icons-material/Add';
import TvIcon from '@mui/icons-material/Tv';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useTVNavigation } from '../../context/TVNavigationContext.js';
import { ImdbHeaderSearch } from './ImdbHeaderSearch.js';

interface NavbarProps {
  onOpenAddMovie: (initialQuery?: string) => void;
  onSearchChange?: (term: string) => void;
  searchTerm?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAddMovie,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isTvMode, toggleTvMode } = useTVNavigation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navItems = [
    { label: 'Home', path: '/', icon: <HomeIcon sx={{ fontSize: 18 }} /> },
    { label: 'My Movies', path: '/movies', icon: <MovieFilterIcon sx={{ fontSize: 18 }} /> },
    { label: 'Watchlists', path: '/watchlists', icon: <PlaylistPlayIcon sx={{ fontSize: 19 }} /> },
    { label: 'Recommendations', path: '/recommendations', icon: <AutoAwesomeIcon sx={{ fontSize: 18 }} /> },
    { label: 'Taste DNA', path: '/taste', icon: <InsightsIcon sx={{ fontSize: 18 }} /> },
    { label: 'Import Center', path: '/import', icon: <CloudUploadIcon sx={{ fontSize: 18 }} /> },
  ];

  const isLinkActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleProfileClick = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleCloseMenu();
    setMobileDrawerOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: 'rgba(7, 9, 14, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 1100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 1.5, sm: 2.5, md: 3 },
          py: 0.75,
          gap: { xs: 1, md: 2 },
          minHeight: '68px',
        }}
      >
        {/* Left Section: Mobile Menu Trigger + Brand Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 3 }, flexShrink: 0 }}>
          {/* Mobile Hamburger Drawer Trigger */}
          <IconButton
            onClick={() => setMobileDrawerOpen(true)}
            sx={{
              display: { xs: 'flex', md: 'none' },
              color: '#F8FAFC',
              p: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 2,
              '&:hover': { backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C' },
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* Brand Logo & Title */}
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'transform 0.15s ease',
              '&:hover': { transform: 'scale(1.02)' },
            }}
          >
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                backgroundColor: 'rgba(229, 169, 60, 0.12)',
                border: '1px solid rgba(229, 169, 60, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(229, 169, 60, 0.2)',
              }}
            >
              <LocalMoviesIcon sx={{ color: '#E5A93C', fontSize: 24 }} />
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Outfit", sans-serif',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: '#F8FAFC',
                  lineHeight: 1.1,
                  fontSize: { xs: '0.95rem', md: '1.15rem' },
                }}
              >
                YOUR CINEMA
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: '#E5A93C',
                  fontSize: '0.62rem',
                  letterSpacing: '0.16em',
                  fontWeight: 700,
                  display: 'block',
                }}
              >
                PERSONAL SANCTUARY
              </Typography>
            </Box>
          </Box>

          {/* Desktop Topbar Navigation Links */}
          <Box
            component="nav"
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 0.5,
              ml: { md: 1, lg: 2 },
            }}
          >
            {navItems.map((item) => {
              const active = isLinkActive(item.path);
              return (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: active ? 700 : 500,
                    fontSize: { md: '0.82rem', lg: '0.88rem' },
                    color: active ? '#E5A93C' : '#94A3B8',
                    backgroundColor: active ? 'rgba(229, 169, 60, 0.12)' : 'transparent',
                    border: active ? '1px solid rgba(229, 169, 60, 0.3)' : '1px solid transparent',
                    borderRadius: 2,
                    px: { md: 1.2, lg: 1.6 },
                    py: 0.7,
                    textTransform: 'none',
                    letterSpacing: '0.01em',
                    transition: 'all 0.2s ease',
                    boxShadow: active ? '0 0 14px rgba(229, 169, 60, 0.15)' : 'none',
                    '&:hover': {
                      color: '#F8FAFC',
                      backgroundColor: active ? 'rgba(229, 169, 60, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                      borderColor: active ? 'rgba(229, 169, 60, 0.5)' : 'rgba(255, 255, 255, 0.12)',
                    },
                    '& .MuiButton-startIcon': {
                      color: active ? '#E5A93C' : '#64748B',
                      mr: 0.8,
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        {/* Center/Right Section: Search + Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 }, flexGrow: 1, justifyContent: 'flex-end' }}>
          {/* IMDb-Style Global Header Search */}
          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', maxWidth: { xs: '100%', md: 360, lg: 440 } }}>
            <ImdbHeaderSearch onOpenAddModalWithQuery={onOpenAddMovie} />
          </Box>

          {/* Add Movie Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => onOpenAddMovie()}
            sx={{
              fontWeight: 700,
              fontSize: { xs: '0.75rem', sm: '0.82rem' },
              px: { xs: 1.2, sm: 1.8 },
              py: 0.7,
              flexShrink: 0,
              borderRadius: 2,
              whiteSpace: 'nowrap',
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            Add Movie
          </Button>

          {/* Small Screen Add Movie Icon Button */}
          <IconButton
            onClick={() => onOpenAddMovie()}
            sx={{
              display: { xs: 'flex', sm: 'none' },
              backgroundColor: '#E5A93C',
              color: '#07090E',
              p: 0.9,
              borderRadius: 2,
              '&:hover': { backgroundColor: '#F59E0B' },
            }}
          >
            <AddIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Android TV Mode Toggle */}
          <Tooltip title={isTvMode ? 'Disable TV Navigation Mode' : 'Enable Android TV / D-Pad Mode'}>
            <IconButton
              onClick={toggleTvMode}
              sx={{
                color: isTvMode ? '#38BDF8' : '#94A3B8',
                backgroundColor: isTvMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isTvMode ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                p: 0.9,
                '&:hover': { color: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.2)' },
              }}
            >
              <TvIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          {/* User Profile Avatar & Menu */}
          <IconButton onClick={handleProfileClick} sx={{ p: 0.4 }}>
            <Avatar
              alt={user?.name || 'User'}
              src={user?.avatar_url || undefined}
              sx={{
                width: 36,
                height: 36,
                bgcolor: '#E5A93C',
                color: '#07090E',
                fontWeight: 800,
                fontSize: '0.92rem',
                border: '1.5px solid rgba(229, 169, 60, 0.5)',
                boxShadow: '0 0 10px rgba(229, 169, 60, 0.25)',
              }}
            >
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>

          {/* User Menu Dropdown */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleCloseMenu}
            PaperProps={{
              sx: {
                backgroundColor: '#0B0F19',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 2.5,
                minWidth: 220,
                mt: 1.5,
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8)',
                p: 0.5,
              },
            }}
          >
            {/* User Details header */}
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                {user?.name || 'Cinematic Connoisseur'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                {user?.email || 'Logged in'}
              </Typography>
            </Box>

            <MenuItem
              onClick={() => {
                handleCloseMenu();
                navigate('/taste');
              }}
              sx={{ py: 1.2, px: 2, borderRadius: 1.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
            >
              <ListItemIcon>
                <InsightsIcon fontSize="small" sx={{ color: '#E5A93C' }} />
              </ListItemIcon>
              <ListItemText primary="My Taste DNA" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 600, color: '#F8FAFC' }} />
            </MenuItem>

            <MenuItem
              onClick={() => {
                handleCloseMenu();
                navigate('/import');
              }}
              sx={{ py: 1.2, px: 2, borderRadius: 1.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
            >
              <ListItemIcon>
                <CloudUploadIcon fontSize="small" sx={{ color: '#38BDF8' }} />
              </ListItemIcon>
              <ListItemText primary="Import Center" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 600, color: '#F8FAFC' }} />
            </MenuItem>

            <MenuItem
              onClick={() => {
                handleCloseMenu();
                navigate('/settings');
              }}
              sx={{ py: 1.2, px: 2, borderRadius: 1.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.06)' } }}
            >
              <ListItemIcon>
                <SettingsIcon fontSize="small" sx={{ color: '#94A3B8' }} />
              </ListItemIcon>
              <ListItemText primary="Settings & Library" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 600, color: '#F8FAFC' }} />
            </MenuItem>

            <Divider sx={{ my: 0.5, borderColor: 'rgba(255, 255, 255, 0.08)' }} />

            <MenuItem
              onClick={handleLogout}
              sx={{ py: 1.2, px: 2, borderRadius: 1.5, '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.12)' } }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: '#EF4444' }} />
              </ListItemIcon>
              <ListItemText primary="Sign Out" primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 600, color: '#EF4444' }} />
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      {/* Responsive Slide-out Navigation Drawer for Tablet & Mobile */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 290,
            backgroundColor: '#07090E',
            backgroundImage: 'linear-gradient(180deg, rgba(229,169,60,0.05) 0%, rgba(7,9,14,0.98) 100%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        }}
      >
        <Box>
          {/* Drawer Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  backgroundColor: 'rgba(229, 169, 60, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LocalMoviesIcon sx={{ color: '#E5A93C', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontFamily: '"Outfit", sans-serif', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.1 }}>
                  YOUR CINEMA
                </Typography>
                <Typography variant="caption" sx={{ color: '#E5A93C', fontSize: '0.62rem', letterSpacing: '0.12em', fontWeight: 700 }}>
                  PERSONAL SANCTUARY
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setMobileDrawerOpen(false)} sx={{ color: '#94A3B8' }}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* User Profile Mini Badge */}
          {user && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Avatar sx={{ width: 34, height: 34, bgcolor: '#E5A93C', color: '#07090E', fontWeight: 800 }}>
                {user.name?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography noWrap variant="body2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                  {user.name || 'User'}
                </Typography>
                <Typography noWrap variant="caption" sx={{ color: '#94A3B8' }}>
                  {user.email}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Quick Action Button: Add Movie */}
          <Button
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setMobileDrawerOpen(false);
              onOpenAddMovie();
            }}
            sx={{ mb: 2, py: 1, fontWeight: 700, borderRadius: 2 }}
          >
            Add Movie to Sanctuary
          </Button>

          {/* Nav List */}
          <Typography variant="overline" sx={{ px: 1, color: '#64748B', fontWeight: 700, letterSpacing: '0.12em' }}>
            NAVIGATION
          </Typography>
          <List sx={{ pt: 0.5 }}>
            {navItems.map((item) => {
              const active = isLinkActive(item.path);
              return (
                <ListItemButton
                  key={item.path}
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    navigate(item.path);
                  }}
                  sx={{
                    borderRadius: 2,
                    mb: 0.7,
                    py: 1,
                    px: 1.5,
                    backgroundColor: active ? 'rgba(229, 169, 60, 0.14)' : 'transparent',
                    border: active ? '1px solid rgba(229, 169, 60, 0.35)' : '1px solid transparent',
                    '&:hover': {
                      backgroundColor: active ? 'rgba(229, 169, 60, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: active ? '#E5A93C' : '#94A3B8' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.9rem',
                      color: active ? '#F8FAFC' : '#94A3B8',
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        {/* Drawer Bottom Actions: Settings & Logout */}
        <Box>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mb: 1.5 }} />

          <ListItemButton
            onClick={() => {
              setMobileDrawerOpen(false);
              navigate('/settings');
            }}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              py: 1,
              px: 1.5,
              backgroundColor: location.pathname === '/settings' ? 'rgba(229, 169, 60, 0.14)' : 'transparent',
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: location.pathname === '/settings' ? '#E5A93C' : '#94A3B8' }}>
              <SettingsIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="Settings & Library"
              primaryTypographyProps={{
                fontWeight: location.pathname === '/settings' ? 700 : 500,
                fontSize: '0.88rem',
                color: location.pathname === '/settings' ? '#F8FAFC' : '#94A3B8',
              }}
            />
          </ListItemButton>

          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              py: 1,
              px: 1.5,
              color: '#EF4444',
              '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: '#EF4444' }}>
              <LogoutIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="Sign Out"
              primaryTypographyProps={{
                fontWeight: 600,
                fontSize: '0.88rem',
                color: '#EF4444',
              }}
            />
          </ListItemButton>
        </Box>
      </Drawer>
    </AppBar>
  );
};
