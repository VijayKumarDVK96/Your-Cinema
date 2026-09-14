import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 10,
        px: 3,
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px dashed rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        my: 3,
      }}
    >
      <Box sx={{ color: '#E5A93C', mb: 2, display: 'flex', fontSize: 48 }}>
        {icon}
      </Box>
      <Typography variant="h5" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ color: '#94A3B8', maxWidth: 460, mb: 3 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" color="primary" onClick={onAction} sx={{ px: 3, py: 1, fontWeight: 700 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};
