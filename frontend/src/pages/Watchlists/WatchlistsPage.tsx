import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';

export const WatchlistsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  // Fetch all user watchlists
  const { data: watchlists = [], isLoading } = useQuery({
    queryKey: ['watchlists'],
    queryFn: async () => {
      const res = await api.get('/watchlists');
      return res.data?.data || [];
    },
  });

  // Fetch selected watchlist details
  const activeId = selectedListId || (watchlists.length > 0 ? watchlists[0].id : null);
  const { data: activeList } = useQuery({
    queryKey: ['watchlist', activeId],
    queryFn: async () => {
      if (!activeId) return null;
      const res = await api.get(`/watchlists/${activeId}`);
      return res.data?.data;
    },
    enabled: !!activeId,
  });

  // Create Watchlist Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/watchlists', {
        name: newListName.trim(),
        description: newListDesc.trim() || null,
      });
    },
    onSuccess: () => {
      setNewListName('');
      setNewListDesc('');
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  // Delete Watchlist Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/watchlists/${id}`);
    },
    onSuccess: () => {
      setSelectedListId(null);
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
            Watchlist Manager
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>
            Organize personal collections, director retrospectives, and curated queues
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          Create Watchlist
        </Button>
      </Box>

      {/* Lists Tabs / Cards Row */}
      <Grid container spacing={2}>
        {watchlists.map((wl: any) => {
          const isActive = wl.id === activeId;
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={wl.id}>
              <Card
                onClick={() => setSelectedListId(wl.id)}
                sx={{
                  cursor: 'pointer',
                  border: isActive ? '2px solid #E5A93C' : '1px solid rgba(255,255,255,0.08)',
                  backgroundColor: isActive ? '#131926' : '#0B0F19',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#E5A93C' },
                }}
              >
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', p: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '1rem' }}>
                      {wl.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1 }}>
                      {wl.movie_count || 0} movies
                    </Typography>
                    {wl.description && (
                      <Typography variant="body2" sx={{ color: '#64748B', fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {wl.description}
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete watchlist "${wl.name}"?`)) {
                        deleteMutation.mutate(wl.id);
                      }
                    }}
                    sx={{ color: '#64748B', '&:hover': { color: '#EF4444' } }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Selected Watchlist Movies Display */}
      {activeList && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
              {activeList.name}
            </Typography>
            {activeList.description && (
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                {activeList.description}
              </Typography>
            )}
          </Box>

          {activeList.movies && activeList.movies.length > 0 ? (
            <Grid container spacing={2.5}>
              {activeList.movies.map((m: any) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={m.user_movie_id}>
                  <MovieCard movie={m} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <EmptyState
              icon={<PlaylistPlayIcon />}
              title="This watchlist is empty"
              description="Browse My Movies and assign movies to this list."
            />
          )}
        </Box>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700 }}>
          Create New Watchlist
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Watchlist Title"
            placeholder="e.g. Christopher Nolan, Weekend Binge, Family Night"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            sx={{ my: 2 }}
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description (Optional)"
            value={newListDesc}
            onChange={(e) => setNewListDesc(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => createMutation.mutate()}
            disabled={!newListName.trim()}
          >
            Create List
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
