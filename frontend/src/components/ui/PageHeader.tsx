import React from 'react';
import { Box, Typography } from '@mui/material';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  badges?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  badges,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        mb: { xs: 2.5, md: 3.5 },
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="h4"
          sx={{
            fontFamily: '"Outfit", sans-serif',
            fontWeight: 800,
            color: '#F8FAFC',
            lineHeight: 1.15,
            fontSize: { xs: '1.5rem', sm: '1.85rem', md: '2.1rem' },
            letterSpacing: '-0.01em',
            mb: 0.5,
          }}
        >
          {title}
        </Typography>

        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              color: '#94A3B8',
              fontSize: { xs: '0.82rem', sm: '0.88rem' },
              lineHeight: 1.5,
            }}
          >
            {subtitle}
          </Typography>
        )}

        {badges && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {badges}
          </Box>
        )}
      </Box>

      {action && (
        <Box sx={{ flexShrink: 0, alignSelf: { xs: 'stretch', sm: 'auto' } }}>
          {action}
        </Box>
      )}
    </Box>
  );
};
