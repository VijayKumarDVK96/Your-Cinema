import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
} from '@mui/material';
import MovieIcon from '@mui/icons-material/Movie';
import CloseIcon from '@mui/icons-material/Close';

export interface FullscreenBackdropModalProps {
  open: boolean;
  onClose: () => void;
  backdropUrl: string | null;
  movieTitle: string;
}

export const FullscreenBackdropModal: React.FC<FullscreenBackdropModalProps> = ({
  open,
  onClose,
  backdropUrl,
  movieTitle,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#07090E',
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 3,
          overflow: 'hidden',
          p: 0,
          m: { xs: 1, sm: 2, md: 3 },
          boxShadow: '0 32px 64px rgba(0, 0, 0, 0.95)',
        },
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', backgroundColor: '#05070B', display: 'flex', flexDirection: 'column' }}>
        {/* Header bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.5,
            backgroundColor: 'rgba(7, 9, 14, 0.95)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <MovieIcon sx={{ color: '#E5A93C', fontSize: 22 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
              {movieTitle} — Full Resolution Backdrop
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: '#94A3B8', '&:hover': { color: '#F8FAFC' } }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Full Image Display */}
        {backdropUrl ? (
          <Box sx={{ p: { xs: 1, sm: 2 }, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <Box
              component="img"
              src={backdropUrl}
              alt={movieTitle}
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 1.5,
                display: 'block',
                boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
              }}
            />
          </Box>
        ) : (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#94A3B8' }}>
              No backdrop image available for this title.
            </Typography>
          </Box>
        )}
      </Box>
    </Dialog>
  );
};
