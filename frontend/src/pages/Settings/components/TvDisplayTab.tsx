import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
} from '@mui/material';
import TvIcon from '@mui/icons-material/Tv';

export interface TvDisplayTabProps {
  isTvMode: boolean;
  onToggleTvMode: () => void;
}

export const TvDisplayTab: React.FC<TvDisplayTabProps> = ({
  isTvMode,
  onToggleTvMode,
}) => {
  return (
    <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <TvIcon sx={{ color: '#38BDF8' }} />
        <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
          Android TV & D-Pad Remote Mode
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
        Enables high-contrast spatial focus rings, D-pad navigation, and 10-foot television display layout.
      </Typography>

      <FormControlLabel
        control={
          <Switch
            checked={isTvMode}
            onChange={onToggleTvMode}
            color="secondary"
          />
        }
        label={isTvMode ? 'TV Mode Active' : 'TV Mode Disabled'}
      />
    </Paper>
  );
};
