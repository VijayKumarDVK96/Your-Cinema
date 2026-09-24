import React, { useState } from 'react';
import { Box } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar.js';
import { Sidebar } from '../components/common/Sidebar.js';
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

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        <Sidebar />

        <Box
          component="main"
          id="main-content"
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
