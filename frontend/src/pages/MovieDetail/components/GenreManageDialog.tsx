import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import { UserMovie } from '../../../types/index.js';

export interface GenreManageDialogProps {
  open: boolean;
  onClose: () => void;
  movie: UserMovie;
  genresData: {
    predefined?: Array<{ id?: string | number; name: string; color?: string }>;
    custom?: Array<{ id: string | number; name: string; color?: string }>;
  } | undefined;
  onSelectGenre: (genreIdentifier: string | number) => void;
  onCreateAndSelectGenre: (genre: { name: string; color: string }) => void;
  isSelecting: boolean;
  isCreating: boolean;
}

const THEME_COLORS = ['#38BDF8', '#EC4899', '#8B5CF6', '#E5A93C', '#10B981', '#F43F5E', '#06B6D4', '#EAB308'];

export const GenreManageDialog: React.FC<GenreManageDialogProps> = ({
  open,
  onClose,
  movie,
  genresData,
  onSelectGenre,
  onCreateAndSelectGenre,
  isSelecting,
  isCreating,
}) => {
  const [newGenreName, setNewGenreName] = useState('');
  const [newGenreColor, setNewGenreColor] = useState('#38BDF8');

  const handleCreate = () => {
    if (!newGenreName.trim()) return;
    onCreateAndSelectGenre({ name: newGenreName.trim(), color: newGenreColor });
    setNewGenreName('');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: '#0F172A',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          minWidth: 380,
          maxWidth: 480,
        },
      }}
    >
      <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CategoryIcon sx={{ color: '#38BDF8' }} /> Select Genre
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
          Pick one genre for <strong>"{movie?.title}"</strong>. This replaces the current genre.
        </Typography>

        {/* Predefined genres */}
        {(genresData?.predefined || []).length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
              Predefined Genres (Select One)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, maxHeight: 130, overflowY: 'auto', pr: 0.5 }}>
              {(genresData?.predefined || []).map((pg: any) => {
                const currentName = ((movie?.custom_genres || [])[0]?.name || (movie?.genres || [])[0]?.name || '').toLowerCase();
                const isActive = currentName === pg.name.toLowerCase();
                return (
                  <Chip
                    key={pg.id || pg.name}
                    label={pg.name}
                    size="small"
                    onClick={() => onSelectGenre(pg.name)}
                    disabled={isSelecting}
                    sx={{
                      backgroundColor: isActive ? `${pg.color || '#38BDF8'}33` : 'rgba(255,255,255,0.05)',
                      color: isActive ? '#F8FAFC' : (pg.color || '#94A3B8'),
                      border: isActive ? `1.5px solid ${pg.color || '#38BDF8'}` : '1px solid rgba(255,255,255,0.1)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(255,255,255,0.12)' },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {/* User custom genres */}
        {genresData?.custom && genresData.custom.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
              Your Custom Genres (Select One)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {genresData.custom.map((cg: any) => {
                const currentName = ((movie?.custom_genres || [])[0]?.name || (movie?.genres || [])[0]?.name || '').toLowerCase();
                const isActive = currentName === cg.name.toLowerCase();
                return (
                  <Chip
                    key={cg.id}
                    label={cg.name}
                    size="small"
                    onClick={() => onSelectGenre(cg.id)}
                    disabled={isSelecting}
                    sx={{
                      backgroundColor: isActive ? `${cg.color || '#38BDF8'}33` : 'rgba(255, 255, 255, 0.05)',
                      color: isActive ? (cg.color || '#38BDF8') : '#94A3B8',
                      border: isActive ? `1.5px solid ${cg.color || '#38BDF8'}` : '1px solid rgba(255, 255, 255, 0.1)',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: `${cg.color || '#38BDF8'}22` },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Create new custom genre */}
        <Typography variant="caption" sx={{ color: '#38BDF8', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
          + Create New Genre
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="e.g. Cyberpunk, Neo-Noir, Space Opera..."
          value={newGenreName}
          onChange={(e) => setNewGenreName(e.target.value)}
          sx={{
            mb: 2,
            input: { color: '#F8FAFC' },
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
              '&:hover fieldset': { borderColor: '#38BDF8' },
              '&.Mui-focused fieldset': { borderColor: '#38BDF8' },
            },
          }}
        />

        <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1 }}>
          Theme Color:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {THEME_COLORS.map((c) => (
            <Box
              key={c}
              onClick={() => setNewGenreColor(c)}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: c,
                cursor: 'pointer',
                border: newGenreColor === c ? '2px solid #FFF' : '2px solid transparent',
                transform: newGenreColor === c ? 'scale(1.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            />
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: '#94A3B8' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          disabled={!newGenreName.trim() || isCreating}
          onClick={handleCreate}
          sx={{ fontWeight: 700 }}
        >
          Create & Set
        </Button>
      </DialogActions>
    </Dialog>
  );
};
