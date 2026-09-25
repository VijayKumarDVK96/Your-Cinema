import React from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  Button,
  Chip,
  keyframes,
} from '@mui/material';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import MovieIcon from '@mui/icons-material/Movie';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Keyframe animations
const pulseGlow = keyframes`
  0% {
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.3), 0 0 30px rgba(229, 169, 60, 0.15);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 25px rgba(56, 189, 248, 0.6), 0 0 50px rgba(229, 169, 60, 0.35);
    transform: scale(1.02);
  }
  100% {
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.3), 0 0 30px rgba(229, 169, 60, 0.15);
    transform: scale(1);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`;

const spinSlow = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const popIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.85) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

export interface ImportProgressState {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  stage: string;
  currentTitle?: string;
  currentPoster?: string | null;
  current: number;
  total: number;
  status: 'idle' | 'running' | 'cancelling' | 'completed' | 'cancelled' | 'error';
  errorMessage?: string;
  successMessage?: string;
}

interface ImportProgressModalProps {
  state: ImportProgressState;
  onCancel: () => void;
  onClose: () => void;
  onViewLibrary?: () => void;
}

export const ImportProgressModal: React.FC<ImportProgressModalProps> = ({
  state,
  onCancel,
  onClose,
  onViewLibrary,
}) => {
  const {
    isOpen,
    title,
    subtitle,
    stage,
    currentTitle,
    currentPoster,
    current,
    total,
    status,
    errorMessage,
    successMessage,
  } = state;

  const progressPercent = total > 0 ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : 0;
  const remaining = Math.max(0, total - current);
  const isRunning = status === 'running';
  const isCancelling = status === 'cancelling';
  const isFinished = status === 'completed' || status === 'cancelled' || status === 'error';

  return (
    <Dialog
      open={isOpen}
      disableEscapeKeyDown={isRunning || isCancelling}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0B0F19',
          backgroundImage: 'radial-gradient(ellipse at 50% -20%, rgba(56, 189, 248, 0.15), rgba(11, 15, 25, 0.95))',
          color: '#F8FAFC',
          borderRadius: 4,
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), 0 0 40px rgba(56, 189, 248, 0.12)',
          backdropFilter: 'blur(16px)',
          overflow: 'hidden',
          animation: `${popIn} 0.25s cubic-bezier(0.16, 1, 0.3, 1)`,
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
        {/* TOP HEADER */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isFinished
                ? status === 'completed'
                  ? 'rgba(16, 185, 129, 0.15)'
                  : status === 'cancelled'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)'
                : 'rgba(56, 189, 248, 0.15)',
              border: `1px solid ${
                isFinished
                  ? status === 'completed'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : status === 'cancelled'
                    ? 'rgba(245, 158, 11, 0.3)'
                    : 'rgba(239, 68, 68, 0.3)'
                  : 'rgba(56, 189, 248, 0.3)'
              }`,
              animation: isRunning ? `${pulseGlow} 2.5s infinite ease-in-out` : undefined,
              flexShrink: 0,
            }}
          >
            {isFinished ? (
              status === 'completed' ? (
                <CheckCircleIcon sx={{ color: '#10B981', fontSize: 30 }} />
              ) : status === 'cancelled' ? (
                <CancelIcon sx={{ color: '#F59E0B', fontSize: 30 }} />
              ) : (
                <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 30 }} />
              )
            ) : (
              <CloudSyncIcon
                sx={{
                  color: '#38BDF8',
                  fontSize: 30,
                  animation: `${spinSlow} 8s linear infinite`,
                }}
              />
            )}
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>
                {isFinished
                  ? status === 'completed'
                    ? 'Sanctuary Import Complete!'
                    : status === 'cancelled'
                    ? 'Import Paused / Cancelled'
                    : 'Import Error'
                  : isCancelling
                  ? 'Stopping Import...'
                  : title}
              </Typography>
              <Chip
                size="small"
                label={
                  isFinished
                    ? status === 'completed'
                      ? '100% Done'
                      : status === 'cancelled'
                      ? 'Cancelled'
                      : 'Failed'
                    : isCancelling
                    ? 'Cancelling...'
                    : `${progressPercent}%`
                }
                sx={{
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  height: 22,
                  backgroundColor: isFinished
                    ? status === 'completed'
                      ? 'rgba(16, 185, 129, 0.2)'
                      : 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(56, 189, 248, 0.2)',
                  color: isFinished
                    ? status === 'completed'
                      ? '#34D399'
                      : '#FBBF24'
                    : '#38BDF8',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
              {subtitle || (isRunning ? 'Processing and verifying sanctuary metadata, posters, & links...' : '')}
            </Typography>
          </Box>
        </Box>

        {/* STATS METRIC COUNTER ROW */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1.5,
            mb: 2.5,
          }}
        >
          {/* Imported Card */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: '#6EE7B7', fontWeight: 700, fontSize: '0.7rem', display: 'block' }}>
              IMPORTED
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981', mt: 0.2 }}>
              {current}
            </Typography>
          </Box>

          {/* Left / Remaining Card */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: '#FCD34D', fontWeight: 700, fontSize: '0.7rem', display: 'block' }}>
              REMAINING
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#F59E0B', mt: 0.2 }}>
              {remaining}
            </Typography>
          </Box>

          {/* Total Card */}
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2.5,
              backgroundColor: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              textAlign: 'center',
            }}
          >
            <Typography variant="caption" sx={{ color: '#7DD3FC', fontWeight: 700, fontSize: '0.7rem', display: 'block' }}>
              TOTAL TITLES
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#38BDF8', mt: 0.2 }}>
              {total}
            </Typography>
          </Box>
        </Box>

        {/* ANIMATED PROGRESS BAR */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.8 }}>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
              {stage || (isRunning ? 'Processing...' : 'Completed')}
            </Typography>
            <Typography variant="caption" sx={{ color: '#38BDF8', fontWeight: 800 }}>
              {current} of {total} ({progressPercent}%)
            </Typography>
          </Box>

          <Box sx={{ position: 'relative', borderRadius: 4, overflow: 'hidden', height: 12, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              sx={{
                height: 12,
                borderRadius: 4,
                backgroundColor: 'transparent',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: isFinished
                    ? status === 'completed'
                      ? 'linear-gradient(90deg, #10B981, #34D399)'
                      : 'linear-gradient(90deg, #F59E0B, #EF4444)'
                    : 'linear-gradient(90deg, #0284C7, #38BDF8, #E5A93C)',
                  transition: 'transform 0.2s ease-out',
                },
              }}
            />
            {isRunning && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)',
                  backgroundSize: '200% 100%',
                  animation: `${shimmer} 2s infinite linear`,
                  pointerEvents: 'none',
                }}
              />
            )}
          </Box>
        </Box>

        {/* ACTIVE ITEM SPOTLIGHT (While Running or Cancelling) */}
        {!isFinished && currentTitle && (
          <Box
            sx={{
              p: 1.75,
              borderRadius: 2.5,
              backgroundColor: '#111827',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2.5,
            }}
          >
            {currentPoster ? (
              <Box
                component="img"
                src={
                  currentPoster.startsWith('http')
                    ? currentPoster
                    : `https://image.tmdb.org/t/p/w200${currentPoster}`
                }
                alt={currentTitle}
                sx={{
                  width: 44,
                  height: 64,
                  borderRadius: 1.5,
                  objectFit: 'cover',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  flexShrink: 0,
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 44,
                  height: 64,
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px dashed rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <MovieIcon sx={{ color: '#38BDF8', fontSize: 24 }} />
              </Box>
            )}

            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="caption" sx={{ color: '#38BDF8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.2 }}>
                Currently Processing
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTitle}
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: 0.2 }}>
                {isCancelling ? 'Wrapping up active transfer before stopping...' : 'Syncing metadata, posters, OTT sources & tags...'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* FINISHED MESSAGE / ERROR ALERT */}
        {isFinished && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2.5,
              backgroundColor: status === 'completed'
                ? 'rgba(16, 185, 129, 0.1)'
                : status === 'cancelled'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${
                status === 'completed'
                  ? 'rgba(16, 185, 129, 0.3)'
                  : status === 'cancelled'
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)'
              }`,
              mb: 2.5,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
            }}
          >
            {status === 'completed' ? (
              <DoneAllIcon sx={{ color: '#10B981', mt: 0.2 }} />
            ) : status === 'cancelled' ? (
              <HourglassEmptyIcon sx={{ color: '#F59E0B', mt: 0.2 }} />
            ) : (
              <ErrorOutlineIcon sx={{ color: '#EF4444', mt: 0.2 }} />
            )}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                {status === 'completed'
                  ? 'Sanctuary Updated Successfully'
                  : status === 'cancelled'
                  ? 'Import Paused'
                  : 'Import Incomplete'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#CBD5E1', display: 'block', mt: 0.3 }}>
                {errorMessage ||
                  successMessage ||
                  (status === 'completed'
                    ? `All ${current} titles were imported and catalogued into your personal sanctuary with custom overrides and OTT links.`
                    : `${current} of ${total} titles were preserved. The rest were skipped.`)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* ACTION BUTTONS */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, alignItems: 'center' }}>
          {!isFinished ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<StopCircleOutlinedIcon />}
              disabled={isCancelling}
              onClick={onCancel}
              sx={{
                borderColor: 'rgba(239, 68, 68, 0.4)',
                color: '#F87171',
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                '&:hover': {
                  borderColor: '#EF4444',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                },
              }}
            >
              {isCancelling ? 'Stopping...' : 'Cancel Import'}
            </Button>
          ) : (
            <>
              {onViewLibrary && (
                <Button
                  variant="outlined"
                  onClick={onViewLibrary}
                  sx={{
                    color: '#38BDF8',
                    borderColor: 'rgba(56, 189, 248, 0.4)',
                    fontWeight: 700,
                    borderRadius: 2,
                    px: 2.5,
                    '&:hover': {
                      borderColor: '#38BDF8',
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    },
                  }}
                >
                  View My Movies
                </Button>
              )}
              <Button
                variant="contained"
                onClick={onClose}
                sx={{
                  background: status === 'completed'
                    ? 'linear-gradient(135deg, #059669, #10B981)'
                    : 'linear-gradient(135deg, #0284C7, #38BDF8)',
                  color: '#FFF',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 3,
                  '&:hover': {
                    background: status === 'completed'
                      ? 'linear-gradient(135deg, #047857, #059669)'
                      : 'linear-gradient(135deg, #0369A1, #0284C7)',
                  },
                }}
              >
                Done
              </Button>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};
