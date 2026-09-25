import React, { useState } from 'react';
import { Box } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar.js';
import { BottomNav } from '../components/common/BottomNav.js';
import { AddMovieModal } from '../components/common/AddMovieModal.js';
import { UniversalPlayer } from '../components/player/UniversalPlayer.js';
import { BackToTop } from '../components/common/BackToTop.js';

export const AppLayout: React.FC = () => {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalInitialQuery, setAddModalInitialQuery] = useState('');

  const handleOpenAddModal = (query?: string) => {
    setAddModalInitialQuery(query || '');
    setAddModalOpen(true);
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#07090E' }}>
      <Navbar
        onOpenAddMovie={handleOpenAddModal}
      />

      <Box
        component="main"
        id="main-content"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 10, md: 5 }, // Extra padding on mobile for BottomNav
          maxWidth: '1680px',
          width: '100%',
          mx: 'auto',
          overflowY: 'auto',
          minHeight: 'calc(100vh - 70px)',
        }}
      >
        <Outlet />
      </Box>

      <BottomNav />

      {/* Global Back to Top Button */}
      <BackToTop targetSelector="#main-content" />

      {/* Add Movie to Library Modal */}
      <AddMovieModal
        open={addModalOpen}
        initialQuery={addModalInitialQuery}
        onClose={() => {
          setAddModalOpen(false);
          setAddModalInitialQuery('');
        }}
        onMovieAdded={() => {
          // Trigger refresh where appropriate
        }}
      />

      {/* Global Universal Player */}
      <UniversalPlayer />
    </Box>
  );
};
