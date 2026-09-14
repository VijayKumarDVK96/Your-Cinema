import React, { useState } from 'react';
import { Box } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar.js';
import { Sidebar } from '../components/common/Sidebar.js';
import { BottomNav } from '../components/common/BottomNav.js';
import { AddMovieModal } from '../components/common/AddMovieModal.js';
import { UniversalPlayer } from '../components/player/UniversalPlayer.js';

export const AppLayout: React.FC = () => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchChange = (term: string) => {
    setGlobalSearchTerm(term);
    if (location.pathname !== '/movies') {
      navigate(`/movies?search=${encodeURIComponent(term)}`);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#07090E' }}>
      <Navbar
        onOpenAddMovie={() => setAddModalOpen(true)}
        searchTerm={globalSearchTerm}
        onSearchChange={handleSearchChange}
      />

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        <Sidebar />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 3.5 },
            pb: { xs: 10, md: 4 }, // Extra padding on mobile for BottomNav
            maxWidth: '1600px',
            width: '100%',
            mx: 'auto',
            overflowY: 'auto',
            height: 'calc(100vh - 65px)',
          }}
        >
          <Outlet />
        </Box>
      </Box>

      <BottomNav />

      {/* Add Movie to Library Modal */}
      <AddMovieModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onMovieAdded={() => {
          // Trigger refresh where appropriate
        }}
      />

      {/* Global Universal Player */}
      <UniversalPlayer />
    </Box>
  );
};
