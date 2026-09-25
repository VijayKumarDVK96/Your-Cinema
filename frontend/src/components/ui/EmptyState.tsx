import React from 'react';
import { Paper, Box, Typography, Button } from '@mui/material';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  actionIcon?: React.ReactNode;
  onAction?: () => void;
  secondaryAction?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  actionIcon,
  onAction,
  secondaryAction,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 4, sm: 6 },
        textAlign: 'center',
        backgroundColor: '#0B0F19',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 3.5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 3,
          backgroundColor: 'rgba(229, 169, 60, 0.12)',
          border: '1px solid rgba(229, 169, 60, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#E5A93C',
          mb: 2,
        }}
      >
        {icon || <MovieFilterIcon sx={{ fontSize: 32 }} />}
      </Box>

      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 700,
          color: '#F8FAFC',
          mb: 0.75,
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          sx={{
            color: '#94A3B8',
            maxWidth: 440,
            mb: actionText || secondaryAction ? 3 : 0,
            lineHeight: 1.6,
          }}
        >
          {description}
        </Typography>
      )}

      {(actionText && onAction) && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={actionIcon}
            onClick={onAction}
            sx={{ fontWeight: 700, px: 2.5, py: 0.9, borderRadius: 2 }}
          >
            {actionText}
          </Button>
          {secondaryAction}
        </Box>
      )}
    </Paper>
  );
};
