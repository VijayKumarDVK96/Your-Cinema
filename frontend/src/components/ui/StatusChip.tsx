import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';

export interface StatusChipProps extends Omit<ChipProps, 'label'> {
  status: 'watched' | 'watching' | 'unwatched' | string;
  showIcon?: boolean;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  showIcon = true,
  size = 'small',
  sx,
  ...rest
}) => {
  const isWatched = status === 'watched';
  const isWatching = status === 'watching';

  const label = isWatched ? 'Watched' : isWatching ? 'Watching' : 'Unwatched';

  const icon = showIcon ? (
    isWatched ? (
      <CheckCircleIcon sx={{ fontSize: '13px !important', color: '#10B981 !important' }} />
    ) : isWatching ? (
      <PlayCircleOutlineIcon sx={{ fontSize: '13px !important', color: '#38BDF8 !important' }} />
    ) : (
      <VisibilityIcon sx={{ fontSize: '13px !important', color: '#94A3B8 !important' }} />
    )
  ) : undefined;

  const bg = isWatched
    ? 'rgba(16, 185, 129, 0.16)'
    : isWatching
    ? 'rgba(56, 189, 248, 0.16)'
    : 'rgba(255, 255, 255, 0.05)';

  const border = isWatched
    ? '1px solid rgba(16, 185, 129, 0.35)'
    : isWatching
    ? '1px solid rgba(56, 189, 248, 0.35)'
    : '1px solid rgba(255, 255, 255, 0.08)';

  const color = isWatched ? '#10B981' : isWatching ? '#38BDF8' : '#94A3B8';

  return (
    <Chip
      icon={icon}
      label={label}
      size={size}
      sx={{
        backgroundColor: bg,
        border,
        color,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.68rem' : '0.78rem',
        borderRadius: 1.5,
        ...sx,
      }}
      {...rest}
    />
  );
};
