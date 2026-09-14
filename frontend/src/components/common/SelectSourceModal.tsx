import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Button,
  Stack,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddLinkIcon from '@mui/icons-material/AddLink';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import { UserMovie, MovieSource } from '../../types/index.js';
import { OttBadge, getOttMeta } from '../../utils/ottProviders.js';

interface SelectSourceModalProps {
  open: boolean;
  onClose: () => void;
  movie: UserMovie;
  onLaunchSource: (source: MovieSource) => void;
  onWatchTrailer: () => void;
  onManageSources: () => void;
}

export const SelectSourceModal: React.FC<SelectSourceModalProps> = ({
  open,
  onClose,
  movie,
  onLaunchSource,
  onWatchTrailer,
  onManageSources,
}) => {
  const sources = movie.sources || [];
  const availableSources = sources;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0A0E18',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Play / Stream Movie
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            {movie.title}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#64748B' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
        {availableSources.length > 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ color: '#94A3B8', mb: 1.5 }}>
              Choose a streaming provider to watch:
            </Typography>
            <Stack spacing={1.5}>
              {availableSources.map((src) => {
                const meta = getOttMeta(src.provider_name, src.provider_icon);
                const isDrive = src.source_type === 'google_drive';
                return (
                  <Box
                    key={src.id}
                    onClick={() => {
                      onLaunchSource(src);
                      onClose();
                    }}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: `1px solid ${meta.borderColor}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ transform: 'scale(1.2)' }}>{meta.icon}</Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ color: meta.textColor, fontWeight: 700, lineHeight: 1.2 }}>
                          {isDrive ? 'Google Drive Stream' : `Watch on ${meta.name}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          {isDrive ? 'Private Cloud Range Proxy' : 'Official OTT Platform'} • {src.quality || '4K UHD'}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton sx={{ color: meta.textColor }}>
                      {isDrive ? <PlayArrowIcon /> : <OpenInNewIcon />}
                    </IconButton>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ) : (
          <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <Typography variant="subtitle2" sx={{ color: '#F87171', fontWeight: 700, mb: 0.5 }}>
              No Movie Streaming Source Linked
            </Typography>
            <Typography variant="caption" sx={{ color: '#CBD5E1', lineHeight: 1.5, display: 'block' }}>
              To watch the full movie, link an OTT subscription (Netflix, Prime, Hotstar) or your Google Drive video file.
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<AddLinkIcon />}
              onClick={() => {
                onClose();
                onManageSources();
              }}
              sx={{ mt: 1.5, fontWeight: 700 }}
            >
              Link Streaming Provider
            </Button>
          </Box>
        )}

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        {/* Separate Trailer Option */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
            Trailer & Extras
          </Typography>
          {movie.trailer_url ? (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<OndemandVideoIcon />}
              onClick={() => {
                onWatchTrailer();
                onClose();
              }}
              sx={{ justifyContent: 'flex-start', py: 1.2, px: 2 }}
            >
              Watch Official Trailer
            </Button>
          ) : (
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              No official trailer available.
            </Typography>
          )}

          <Button
            size="small"
            startIcon={<AddLinkIcon />}
            onClick={() => {
              onClose();
              onManageSources();
            }}
            sx={{ color: '#38BDF8', fontSize: '0.78rem', justifyContent: 'flex-start', mt: 0.5 }}
          >
            Manage / Add More Streaming Sources
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
