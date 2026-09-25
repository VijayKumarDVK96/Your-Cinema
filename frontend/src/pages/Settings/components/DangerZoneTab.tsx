import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export interface DangerZoneTabProps {
  clearSuccessMsg: string | null;
  clearDialogOpen: boolean;
  setClearDialogOpen: (v: boolean) => void;
  clearing: boolean;
  onClearLibrary: () => void;
}

export const DangerZoneTab: React.FC<DangerZoneTabProps> = ({
  clearSuccessMsg,
  clearDialogOpen,
  setClearDialogOpen,
  clearing,
  onClearLibrary,
}) => {
  return (
    <>
      <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <DeleteSweepIcon sx={{ color: '#EF4444' }} />
          <Typography variant="h6" sx={{ color: '#EF4444', fontWeight: 700 }}>
            Danger Zone — Reset Sanctuary (Movies, Series, Watchlists & Custom Genres)
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
          Permanently remove all imported movies, series, watchlists, custom genres, and viewing history from your personal cinema library. This will reset your library count, all created watchlists, custom defined genres, watch history, personal ratings, custom notes, and list associations. Movies stored on external providers (Google Drive / YouTube / OTT) will remain unaffected.
        </Typography>

        {clearSuccessMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {clearSuccessMsg}
          </Alert>
        )}

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteSweepIcon />}
          onClick={() => setClearDialogOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          Remove All Movies, Series, Watchlists & Custom Genres
        </Button>
      </Paper>

      {/* Clear Library Confirmation Dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon /> Confirm Sanctuary Reset
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#CBD5E1', mb: 2 }}>
            Are you absolutely sure you want to remove <strong>ALL movies, series, watchlists, and custom genres</strong> from your library?
          </Typography>
          <Alert severity="error" sx={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#FCA5A5' }}>
            This action cannot be undone. All your personal ratings, watch history, custom watchlists, custom genres, and customized metadata will be cleared.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setClearDialogOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={onClearLibrary}
            disabled={clearing}
            sx={{ fontWeight: 700 }}
          >
            {clearing ? 'Removing...' : 'Yes, Delete Everything'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
