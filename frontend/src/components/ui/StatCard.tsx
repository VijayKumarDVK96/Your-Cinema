import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  accentColor = '#E5A93C',
  onClick,
}) => {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        backgroundColor: '#0B0F19',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': onClick
          ? {
              transform: 'translateY(-3px)',
              borderColor: `${accentColor}55`,
              boxShadow: `0 12px 28px rgba(0, 0, 0, 0.5), 0 0 16px ${accentColor}15`,
            }
          : {},
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          opacity: 0.6,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography
          variant="overline"
          sx={{
            color: '#94A3B8',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Typography>
        {icon && (
          <Box sx={{ color: accentColor, opacity: 0.85, display: 'flex' }}>
            {icon}
          </Box>
        )}
      </Box>

      <Typography
        variant="h4"
        sx={{
          fontFamily: '"Outfit", sans-serif',
          fontWeight: 800,
          color: '#F8FAFC',
          fontSize: { xs: '1.6rem', sm: '2rem' },
          lineHeight: 1.1,
          mb: 0.5,
        }}
      >
        {value}
      </Typography>

      {subValue && (
        <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.78rem' }}>
          {subValue}
        </Typography>
      )}
    </Paper>
  );
};
