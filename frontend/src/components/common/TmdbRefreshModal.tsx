import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Divider,
  Alert,
} from '@mui/material';
import { api } from '../../api/client.js';

interface TmdbRefreshModalProps {
  open: boolean;
  onClose: () => void;
  userMovieId: string;
  onRefreshed: () => void;
}

export const TmdbRefreshModal: React.FC<TmdbRefreshModalProps> = ({
  open,
  onClose,
  userMovieId,
  onRefreshed,
}) => {
  const [loading, setLoading] = useState(true);
  const [diffData, setDiffData] = useState<any>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      api.get(`/movies/${userMovieId}/tmdb-diff`)
        .then((res) => {
          setDiffData(res.data?.data);
          // Default select fields where TMDB differs and field is not custom overridden
          const fields = res.data?.data?.fields || {};
          const autoSelect: string[] = [];
          Object.entries(fields).forEach(([key, val]: [string, any]) => {
            if (val.current !== val.tmdb && !val.isOverridden) {
              autoSelect.push(key);
            }
          });
          setSelectedFields(autoSelect);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [open, userMovieId]);

  const handleToggle = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleApply = async (fullOverwrite: boolean = false) => {
    setSaving(true);
    try {
      await api.post(`/movies/${userMovieId}/tmdb-refresh`, {
        selectedFields,
        fullOverwrite,
      });
      onRefreshed();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700 }}>
        Selective TMDB Refresh
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
              Select only the fields you wish to update from TMDB. Your custom edits will remain untouched unless chosen.
            </Typography>

            {diffData?.fields && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                {Object.entries(diffData.fields).map(([field, data]: [string, any]) => (
                  <Box
                    key={field}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedFields.includes(field)}
                          onChange={() => handleToggle(field)}
                          sx={{ color: '#E5A93C', '&.Mui-checked': { color: '#E5A93C' } }}
                        />
                      }
                      label={
                        <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 600, textTransform: 'capitalize' }}>
                          {field} {data.isOverridden && <span style={{ color: '#F59E0B', fontSize: '0.75rem' }}>(Custom Edit)</span>}
                        </Typography>
                      }
                    />
                    <Box sx={{ pl: 4, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        Current: <span style={{ color: '#CBD5E1' }}>{String(data.current || 'None')}</span>
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#38BDF8' }}>
                        TMDB Live: <span style={{ color: '#7DD3FC' }}>{String(data.tmdb || 'None')}</span>
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            <Alert severity="info" sx={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8' }}>
              You can apply selected changes or completely reset to official TMDB data.
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
        <Button
          color="error"
          onClick={() => {
            if (window.confirm('Are you sure you want to discard all your personal edits for this movie and replace with live TMDB data?')) {
              handleApply(true);
            }
          }}
          disabled={saving || loading}
        >
          Reset to TMDB
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleApply(false)}
            disabled={saving || loading || selectedFields.length === 0}
          >
            Apply Selected Changes
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
