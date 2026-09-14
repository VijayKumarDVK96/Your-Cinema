import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Rating,
  TextField,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import { api } from '../../api/client.js';

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  userMovieId: string;
  movieTitle: string;
  initialRating?: number | null;
  initialNotes?: string | null;
  onRated?: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  open,
  onClose,
  userMovieId,
  movieTitle,
  initialRating,
  initialNotes,
  onRated,
}) => {
  const [rating, setRating] = useState<number | null>(initialRating || 0);
  const [notes, setNotes] = useState<string>(initialNotes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/movies/${userMovieId}`, {
        personal_rating: rating,
        personal_notes: notes.trim() || null,
        watch_status: 'watched', // rating implies watched
      });
      if (onRated) onRated();
      onClose();
    } catch {
      // Error handled by interceptor
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700 }}>
        Rate & Log "{movieTitle}"
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2, gap: 1.5 }}>
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>
            How would you rate this film?
          </Typography>
          <Rating
            value={rating}
            precision={0.5}
            onChange={(_, val) => setRating(val)}
            size="large"
            emptyIcon={<StarIcon sx={{ color: 'rgba(255,255,255,0.15)', fontSize: 36 }} />}
            icon={<StarIcon sx={{ color: '#E5A93C', fontSize: 36 }} />}
          />
          <Typography variant="h5" sx={{ color: '#E5A93C', fontWeight: 700 }}>
            {rating != null && !isNaN(Number(rating)) ? `${Number(rating).toFixed(1)} / 5.0` : 'Not Rated'}
          </Typography>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Personal Notes or Review (Optional)"
          placeholder="e.g. Watched with family. Loved the score and pacing..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: '#94A3B8' }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={saving}>
          Save Rating
        </Button>
      </DialogActions>
    </Dialog>
  );
};
