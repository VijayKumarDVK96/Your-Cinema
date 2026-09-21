import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Typography,
} from '@mui/material';
import { UserMovie } from '../../types/index.js';
import { api } from '../../api/client.js';

interface EditMovieModalProps {
  open: boolean;
  onClose: () => void;
  movie: UserMovie;
  onUpdated: () => void;
}

export const LANGUAGE_LIST = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ko', name: 'Korean' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'es', name: 'Spanish' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
];

export const EditMovieModal: React.FC<EditMovieModalProps> = ({ open, onClose, movie, onUpdated }) => {
  const [title, setTitle] = useState(movie.title || '');
  const [overview, setOverview] = useState(movie.overview || '');
  const [director, setDirector] = useState(movie.director || '');
  const [runtime, setRuntime] = useState<number | string>(movie.runtime || '');
  const [language, setLanguage] = useState(movie.original_language || 'en');
  const [customPosterUrl, setCustomPosterUrl] = useState(movie.custom_poster_url || '');
  const [customBackdropUrl, setCustomBackdropUrl] = useState(movie.custom_backdrop_url || '');
  const [trailerUrl, setTrailerUrl] = useState(movie.trailer_url || '');
  const [watchStatus, setWatchStatus] = useState(movie.watch_status || 'unwatched');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/movies/${movie.user_movie_id}`, {
        custom_title: title.trim() || null,
        custom_overview: overview.trim() || null,
        custom_director: director.trim() || null,
        custom_runtime: runtime ? Number(runtime) : null,
        original_language: language.trim() || null,
        custom_poster_url: customPosterUrl.trim() || null,
        custom_backdrop_url: customBackdropUrl.trim() || null,
        trailer_url: trailerUrl.trim() || null,
        watch_status: watchStatus,
      });
      onUpdated();
      onClose();
    } catch {
      // Error handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700 }}>
        Edit Movie Details & Overrides
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
          You own your metadata. Any modifications made here take precedence over TMDB data.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth
              label="Movie Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="Watch Status"
              value={watchStatus}
              onChange={(e) => setWatchStatus(e.target.value as any)}
            >
              <MenuItem value="unwatched">Unwatched</MenuItem>
              <MenuItem value="watching">Watching</MenuItem>
              <MenuItem value="watched">Watched</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Director"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Runtime (Minutes)"
              value={runtime}
              onChange={(e) => setRuntime(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              select
              label="Original Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGE_LIST.map((l) => (
                <MenuItem key={l.code} value={l.code}>
                  {l.name} ({l.code.toUpperCase()})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Overview / Synopsis"
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Custom Poster Image URL"
              placeholder="https://..."
              value={customPosterUrl}
              onChange={(e) => setCustomPosterUrl(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Custom Backdrop Banner URL"
              placeholder="https://..."
              value={customBackdropUrl}
              onChange={(e) => setCustomBackdropUrl(e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Official Trailer URL (YouTube)"
              placeholder="https://www.youtube.com/watch?v=..."
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
              helperText="Link or update the official YouTube trailer for this title"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: '#94A3B8' }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
