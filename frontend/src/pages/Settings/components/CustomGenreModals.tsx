import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import EditIcon from '@mui/icons-material/Edit';
import { ConfirmDeleteModal } from '../../../components/ui/index.js';

const THEME_COLORS = ['#38BDF8', '#EC4899', '#8B5CF6', '#E5A93C', '#10B981', '#F43F5E', '#06B6D4', '#EAB308', '#64748B'];

export interface CustomGenreModalsProps {
  addGenreOpen: boolean;
  onCloseAddGenre: () => void;
  onCreateGenre: (data: { name: string; color: string; description?: string }) => void;
  isCreatingGenre: boolean;

  editingGenre: any | null;
  onCloseEditGenre: () => void;
  onUpdateGenre: (id: string, data: { name: string; color: string; description?: string }) => void;
  isUpdatingGenre: boolean;

  genreToDelete: { id: string; name: string } | null;
  onCloseDeleteGenre: () => void;
  onConfirmDeleteGenre: (id: string) => void;
  isDeletingGenre: boolean;

  genreErrorMsg: string | null;
}

export const CustomGenreModals: React.FC<CustomGenreModalsProps> = ({
  addGenreOpen,
  onCloseAddGenre,
  onCreateGenre,
  isCreatingGenre,
  editingGenre,
  onCloseEditGenre,
  onUpdateGenre,
  isUpdatingGenre,
  genreToDelete,
  onCloseDeleteGenre,
  onConfirmDeleteGenre,
  isDeletingGenre,
  genreErrorMsg,
}) => {
  // Add state
  const [newGenreName, setNewGenreName] = useState('');
  const [newGenreColor, setNewGenreColor] = useState('#38BDF8');
  const [newGenreDesc, setNewGenreDesc] = useState('');

  // Edit state
  const [editGenreName, setEditGenreName] = useState('');
  const [editGenreColor, setEditGenreColor] = useState('#38BDF8');
  const [editGenreDesc, setEditGenreDesc] = useState('');

  useEffect(() => {
    if (editingGenre) {
      setEditGenreName(editingGenre.name || '');
      setEditGenreColor(editingGenre.color || '#38BDF8');
      setEditGenreDesc(editingGenre.description || '');
    }
  }, [editingGenre]);

  const handleCreate = () => {
    if (!newGenreName.trim()) return;
    onCreateGenre({ name: newGenreName.trim(), color: newGenreColor, description: newGenreDesc.trim() });
    setNewGenreName('');
    setNewGenreDesc('');
  };

  const handleUpdate = () => {
    if (!editingGenre || !editGenreName.trim()) return;
    onUpdateGenre(editingGenre.id, {
      name: editGenreName.trim(),
      color: editGenreColor,
      description: editGenreDesc.trim(),
    });
  };

  return (
    <>
      {/* Create Custom Genre Dialog */}
      <Dialog
        open={addGenreOpen}
        onClose={onCloseAddGenre}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CategoryIcon sx={{ color: '#38BDF8' }} /> New Custom Genre
        </DialogTitle>
        <DialogContent>
          {genreErrorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {genreErrorMsg}
            </Alert>
          )}
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
            Define a personal cinematic genre or sub-genre for your library:
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Genre Name"
            placeholder="e.g. Cyberpunk, Neo-Noir, Space Opera..."
            value={newGenreName}
            onChange={(e) => setNewGenreName(e.target.value)}
            sx={{ mb: 2.5, input: { color: '#F8FAFC' } }}
          />
          <TextField
            fullWidth
            size="small"
            label="Description (Optional)"
            placeholder="Brief definition or aesthetic summary"
            value={newGenreDesc}
            onChange={(e) => setNewGenreDesc(e.target.value)}
            sx={{ mb: 2.5, input: { color: '#F8FAFC' } }}
          />
          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1 }}>
            Badge Accent Color:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {THEME_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => setNewGenreColor(c)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border: newGenreColor === c ? '2.5px solid #FFF' : '2px solid transparent',
                  transform: newGenreColor === c ? 'scale(1.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onCloseAddGenre} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!newGenreName.trim() || isCreatingGenre}
            onClick={handleCreate}
            sx={{ fontWeight: 700 }}
          >
            Create Genre
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Custom Genre Dialog */}
      <Dialog
        open={Boolean(editingGenre)}
        onClose={onCloseEditGenre}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon sx={{ color: '#38BDF8' }} /> Edit Custom Genre
        </DialogTitle>
        <DialogContent>
          {genreErrorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {genreErrorMsg}
            </Alert>
          )}
          <TextField
            fullWidth
            size="small"
            label="Genre Name"
            value={editGenreName}
            onChange={(e) => setEditGenreName(e.target.value)}
            sx={{ my: 2, input: { color: '#F8FAFC' } }}
          />
          <TextField
            fullWidth
            size="small"
            label="Description"
            value={editGenreDesc}
            onChange={(e) => setEditGenreDesc(e.target.value)}
            sx={{ mb: 2.5, input: { color: '#F8FAFC' } }}
          />
          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1 }}>
            Badge Accent Color:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {THEME_COLORS.map((c) => (
              <Box
                key={c}
                onClick={() => setEditGenreColor(c)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border: editGenreColor === c ? '2.5px solid #FFF' : '2px solid transparent',
                  transform: editGenreColor === c ? 'scale(1.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onCloseEditGenre} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!editGenreName.trim() || isUpdatingGenre}
            onClick={handleUpdate}
            sx={{ fontWeight: 700 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Custom Genre Confirmation Modal */}
      <ConfirmDeleteModal
        open={!!genreToDelete}
        onClose={onCloseDeleteGenre}
        onConfirm={() => {
          if (genreToDelete) {
            onConfirmDeleteGenre(genreToDelete.id);
          }
        }}
        isLoading={isDeletingGenre}
        title="Delete Custom Genre"
        description={
          genreToDelete
            ? `Are you sure you want to delete the custom genre "${genreToDelete.name}"?`
            : ''
        }
      />
    </>
  );
};
