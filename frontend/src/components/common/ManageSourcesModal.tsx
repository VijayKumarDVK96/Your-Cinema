import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  Tooltip,
  Divider,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { UserMovie, MovieSource } from '../../types/index.js';
import { OttBadge, getOttMeta } from '../../utils/ottProviders.js';
import { extractDriveFileId } from '../../utils/googleDrive.js';

interface ManageSourcesModalProps {
  open: boolean;
  onClose: () => void;
  movie: UserMovie;
  onSourcesChanged?: () => void;
}

const POPULAR_PROVIDERS = [
  { name: 'Netflix', icon: 'netflix', type: 'ott' as const },
  { name: 'Amazon Prime Video', icon: 'prime', type: 'ott' as const },
  { name: 'JioHotstar', icon: 'hotstar', type: 'ott' as const },
  { name: 'Sun NXT', icon: 'sunnxt', type: 'ott' as const },
  { name: 'Apple TV+', icon: 'appletv', type: 'ott' as const },
  { name: 'JioCinema', icon: 'jiocinema', type: 'ott' as const },
  { name: 'Zee5', icon: 'zee5', type: 'ott' as const },
  { name: 'Sony LIV', icon: 'sonyliv', type: 'ott' as const },
  { name: 'Lionsgate Play', icon: 'lionsgateplay', type: 'ott' as const },
  { name: 'Aha', icon: 'aha', type: 'ott' as const },
  { name: 'Vi Movies & TV', icon: 'vimovies', type: 'ott' as const },
  { name: 'Google Drive', icon: 'google_drive', type: 'google_drive' as const },
  { name: 'YouTube', icon: 'youtube', type: 'youtube' as const },
];

export const ManageSourcesModal: React.FC<ManageSourcesModalProps> = ({
  open,
  onClose,
  movie,
  onSourcesChanged,
}) => {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<string>('Netflix');
  const [sourceType, setSourceType] = useState<'ott' | 'google_drive' | 'youtube' | 'custom_url'>('ott');
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [externalFileId, setExternalFileId] = useState<string>('');
  const [quality, setQuality] = useState<string>('4K UHD');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // Auto-fill URL when provider changes
  const handleSelectPreset = (preset: typeof POPULAR_PROVIDERS[0]) => {
    setSelectedProvider(preset.name);
    setSourceType(preset.type);
    const meta = getOttMeta(preset.name, preset.icon);
    if (preset.type === 'ott') {
      setExternalUrl(meta.getDefaultSearchUrl(movie.title));
    } else if (preset.type === 'youtube') {
      setExternalUrl(meta.getDefaultSearchUrl(movie.title));
    }
  };

  // Add source mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      setErrorMsg(null);
      const payload: any = {
        userMovieId: movie.user_movie_id,
        sourceType,
        providerName: selectedProvider,
        quality,
      };

      if (sourceType === 'google_drive') {
        const cleanFileId = extractDriveFileId(externalFileId);
        if (!cleanFileId) throw new Error('Please enter a valid Google Drive URL or File ID.');
        payload.externalFileId = cleanFileId;
        payload.externalUrl = externalFileId.trim().startsWith('http')
          ? externalFileId.trim()
          : `https://drive.google.com/file/d/${cleanFileId}/view`;
        payload.providerIcon = 'google_drive';
      } else {
        if (!externalUrl.trim()) throw new Error('Please enter a valid external streaming or search URL.');
        payload.externalUrl = externalUrl.trim();
        payload.providerIcon = sourceType === 'youtube' ? 'youtube' : getOttMeta(selectedProvider).key;
      }

      await api.post('/sources', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movie', movie.user_movie_id] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      setExternalUrl('');
      setExternalFileId('');
      if (onSourcesChanged) onSourcesChanged();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to add source');
    },
  });

  // Delete source — per-source loading state prevents double-clicks & race conditions
  const handleDeleteSource = useCallback(async (sourceId: string) => {
    if (deletingIds.has(sourceId)) return; // already in-flight
    setDeletingIds(prev => new Set(prev).add(sourceId));
    try {
      await api.delete(`/sources/${sourceId}`);
      queryClient.invalidateQueries({ queryKey: ['movie', movie.user_movie_id] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      if (onSourcesChanged) onSourcesChanged();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to delete source');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  }, [deletingIds, movie.user_movie_id, onSourcesChanged, queryClient]);

  const existingSources = movie.sources || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#07090E',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Streaming & Playback Sources
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
            {movie.title} ({movie.release_date?.substring(0, 4)})
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#64748B' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {errorMsg && <Alert severity="error">{errorMsg}</Alert>}

        {/* Existing sources list */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#CBD5E1', fontWeight: 600 }}>
              Linked Providers ({existingSources.length})
            </Typography>
          </Box>

          {existingSources.length === 0 ? (
            <Box sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                No playback sources linked yet. Choose an OTT platform below to link it!
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1}>
              {existingSources.map((s: MovieSource) => (
                <Box
                  key={s.id}
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <OttBadge providerName={s.provider_name} providerIcon={s.provider_icon} size="small" />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                        {s.source_type.replace('_', ' ').toUpperCase()} • {s.quality || '1080p'}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteSource(s.id)}
                    disabled={deletingIds.has(s.id)}
                    sx={{
                      color: deletingIds.has(s.id) ? '#475569' : '#64748B',
                      '&:hover': { color: '#EF4444' },
                      transition: 'color 0.15s',
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

        {/* 1-Click Preset Selection */}
        <Box>
          <Typography variant="subtitle2" sx={{ color: '#CBD5E1', fontWeight: 600, mb: 1 }}>
            Quick-Link Streaming Platform
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
            {POPULAR_PROVIDERS.map((p) => {
              const isSelected = selectedProvider === p.name;
              return (
                <Box
                  key={p.name}
                  onClick={() => handleSelectPreset(p)}
                  sx={{
                    cursor: 'pointer',
                    opacity: isSelected ? 1 : 0.75,
                    transform: isSelected ? 'scale(1.04)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <OttBadge providerName={p.name} providerIcon={p.icon} size="small" interactive />
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Provider configuration form */}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
            <TextField
              label="Provider Name"
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              size="small"
            />
            <TextField
              select
              label="Quality"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              size="small"
            >
              <MenuItem value="4K UHD">4K UHD</MenuItem>
              <MenuItem value="1080p">1080p Full HD</MenuItem>
              <MenuItem value="720p">720p HD</MenuItem>
            </TextField>
          </Box>

          {sourceType === 'google_drive' ? (
            <TextField
              label="Google Drive Link or File ID"
              placeholder="e.g. https://drive.google.com/file/d/... or File ID"
              value={externalFileId}
              onChange={(e) => setExternalFileId(e.target.value)}
              size="small"
              helperText="Paste full Google Drive sharing link or bare File ID"
            />
          ) : (
            <TextField
              label="Watch / Portal URL"
              placeholder="https://www.netflix.com/title/..."
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              size="small"
              helperText="Direct deep-link or search query on the official platform"
            />
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending}
            sx={{ fontWeight: 700 }}
          >
            {addMutation.isPending ? 'Linking...' : `Link ${selectedProvider} Source`}
          </Button>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <Button onClick={onClose} variant="outlined" sx={{ color: '#94A3B8' }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};
