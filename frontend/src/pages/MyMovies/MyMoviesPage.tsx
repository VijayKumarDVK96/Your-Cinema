import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  ButtonGroup,
  Checkbox,
  Stack,
  Chip,
  Paper,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ListItemIcon,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import AddIcon from '@mui/icons-material/Add';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StarIcon from '@mui/icons-material/Star';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { FilterBar } from '../../components/common/FilterBar.js';
import { SkeletonGrid } from '../../components/feedback/SkeletonGrid.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import { usePlayer } from '../../context/PlayerContext.js';
import { isYouTubeSource } from '../../utils/youtube.js';

export const MyMoviesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { openPlayer } = usePlayer();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [status, setStatus] = useState<string>('all');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [genreId, setGenreId] = useState<string | number | undefined>(undefined);
  const [language, setLanguage] = useState<string | undefined>(undefined);
  const [ott, setOtt] = useState<string | undefined>(undefined);
  const [tagId, setTagId] = useState<string | undefined>(undefined);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('added_at');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [watchlistAnchorEl, setWatchlistAnchorEl] = useState<null | HTMLElement>(null);
  const [createWatchlistOpen, setCreateWatchlistOpen] = useState(false);
  const [newWatchlistNameInput, setNewWatchlistNameInput] = useState('');
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);

  // Bulk Edit Tags & Genres state
  const [bulkTagsGenresOpen, setBulkTagsGenresOpen] = useState(false);
  const [bulkGenreMode, setBulkGenreMode] = useState<'add' | 'remove'>('add');
  const [selectedBulkTagIds, setSelectedBulkTagIds] = useState<Set<string>>(new Set());
  const [selectedBulkGenreIds, setSelectedBulkGenreIds] = useState<Set<string>>(new Set());
  const [newTagNameInput, setNewTagNameInput] = useState('');
  const [newGenreNameInput, setNewGenreNameInput] = useState('');

  const searchTerm = searchParams.get('search') || '';

  // Query Movies
  const { data, isLoading } = useQuery({
    queryKey: ['my-movies', { status, mediaType, genreId, language, ott, tagId, isFavorite, sortBy, search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status', status);
      if (mediaType !== 'all') params.append('mediaType', mediaType);
      if (genreId !== undefined && genreId !== null) params.append('genreId', genreId.toString());
      if (language) params.append('language', language);
      if (ott) params.append('ott', ott);
      if (tagId) params.append('tagId', tagId);
      if (isFavorite) params.append('isFavorite', 'true');
      if (searchTerm) params.append('search', searchTerm);
      params.append('sortBy', sortBy);

      const res = await api.get(`/movies?${params.toString()}`);
      return res.data?.data;
    },
  });

  // Query Tags for filter dropdown
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data?.data || [];
    },
  });

  // Query Genres (predefined and custom) for filter dropdown
  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return res.data?.data;
    },
  });

  const movies = data?.movies || [];

  // Query Watchlists for bulk add
  const { data: watchlists = [] } = useQuery<any[]>({
    queryKey: ['watchlists'],
    queryFn: async () => {
      const res = await api.get('/watchlists');
      return res.data?.data || [];
    },
  });

  // Bulk Mutation
  const bulkMutation = useMutation({
    mutationFn: async (action: 'mark_watched' | 'mark_unwatched' | 'favorite' | 'delete') => {
      await api.post('/movies/bulk', {
        movieIds: Array.from(selectedIds),
        action,
      });
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      setIsBulkMode(false);
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['taste-profile'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });

  const bulkWatchlistMutation = useMutation({
    mutationFn: async (payload: { watchlistId?: string; newWatchlistName?: string }) => {
      await api.post('/movies/bulk', {
        movieIds: Array.from(selectedIds),
        action: 'add_to_watchlist',
        ...payload,
      });
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      setIsBulkMode(false);
      setWatchlistAnchorEl(null);
      setCreateWatchlistOpen(false);
      setNewWatchlistNameInput('');
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  const bulkTagsGenresMutation = useMutation({
    mutationFn: async () => {
      await api.post('/movies/bulk', {
        movieIds: Array.from(selectedIds),
        action: 'edit_tags_genres',
        tagIds: Array.from(selectedBulkTagIds),
        genreIds: Array.from(selectedBulkGenreIds),
        mode: bulkGenreMode,
      });
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      setIsBulkMode(false);
      setBulkTagsGenresOpen(false);
      setSelectedBulkTagIds(new Set());
      setSelectedBulkGenreIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/tags', { name });
      return res.data?.data;
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      if (newTag?.id) {
        setSelectedBulkTagIds(prev => new Set(prev).add(newTag.id));
      }
      setNewTagNameInput('');
    },
  });

  const createGenreMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/genres', { name });
      return res.data?.data;
    },
    onSuccess: (newGenre) => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      if (newGenre?.id) {
        setSelectedBulkGenreIds(new Set([newGenre.id]));
      }
      setNewGenreNameInput('');
    },
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === movies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(movies.map((m: any) => m.user_movie_id)));
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
            My Cinema Library
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>
            {movies.length} {mediaType === 'movie' ? 'movies' : mediaType === 'tv' ? 'web series' : 'titles'} in your personal sanctuary
            {searchTerm && ` matching "${searchTerm}"`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant={isBulkMode ? 'contained' : 'outlined'}
            color={isBulkMode ? 'secondary' : 'inherit'}
            size="small"
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              setSelectedIds(new Set());
            }}
            sx={{ fontWeight: 600, color: isBulkMode ? '#000' : '#CBD5E1' }}
          >
            {isBulkMode ? 'Exit Bulk Mode' : 'Bulk Select'}
          </Button>

          <ButtonGroup size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 1.5 }}>
            <Button
              onClick={() => setViewMode('grid')}
              variant={viewMode === 'grid' ? 'contained' : 'outlined'}
              sx={{
                backgroundColor: viewMode === 'grid' ? 'rgba(229,169,60,0.18)' : 'transparent',
                color: viewMode === 'grid' ? '#E5A93C' : '#64748B',
                borderColor: viewMode === 'grid' ? '#E5A93C' : 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: viewMode === 'grid' ? 'rgba(229,169,60,0.25)' : 'rgba(255,255,255,0.08)',
                },
              }}
            >
              <GridViewIcon fontSize="small" />
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'contained' : 'outlined'}
              sx={{
                backgroundColor: viewMode === 'list' ? 'rgba(229,169,60,0.18)' : 'transparent',
                color: viewMode === 'list' ? '#E5A93C' : '#64748B',
                borderColor: viewMode === 'list' ? '#E5A93C' : 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: viewMode === 'list' ? 'rgba(229,169,60,0.25)' : 'rgba(255,255,255,0.08)',
                },
              }}
            >
              <ViewListIcon fontSize="small" />
            </Button>
          </ButtonGroup>
        </Box>
      </Box>

      {/* Bulk Action Bar */}
      {isBulkMode && (
        <Paper
          sx={{
            p: 2,
            backgroundColor: '#111827',
            border: '1px solid #38BDF8',
            borderRadius: 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox
              checked={movies.length > 0 && selectedIds.size === movies.length}
              indeterminate={selectedIds.size > 0 && selectedIds.size < movies.length}
              onChange={handleSelectAll}
              sx={{ color: '#38BDF8', '&.Mui-checked': { color: '#38BDF8' } }}
            />
            <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
              {selectedIds.size} of {movies.length} selected
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              color="success"
              startIcon={<CheckCircleIcon />}
              disabled={selectedIds.size === 0}
              onClick={() => bulkMutation.mutate('mark_watched')}
            >
              Mark Watched
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<FavoriteIcon />}
              disabled={selectedIds.size === 0}
              onClick={() => bulkMutation.mutate('favorite')}
            >
              Favorite
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{
                color: '#E5A93C',
                borderColor: 'rgba(229, 169, 60, 0.5)',
                '&:hover': { borderColor: '#E5A93C', backgroundColor: 'rgba(229,169,60,0.1)' },
              }}
              startIcon={<PlaylistAddIcon />}
              disabled={selectedIds.size === 0}
              onClick={(e) => setWatchlistAnchorEl(e.currentTarget)}
            >
              Add to Watchlist
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{
                color: '#38BDF8',
                borderColor: 'rgba(56, 189, 248, 0.5)',
                '&:hover': { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.1)' },
              }}
              startIcon={<LocalOfferIcon />}
              disabled={selectedIds.size === 0}
              onClick={() => setBulkTagsGenresOpen(true)}
            >
              Edit Tags & Genres
            </Button>
            <Button
              size="small"
              variant="contained"
              color="error"
              startIcon={<DeleteOutlineIcon />}
              disabled={selectedIds.size === 0}
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${selectedIds.size} selected movies?`)) {
                  bulkMutation.mutate('delete');
                }
              }}
            >
              Delete
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Watchlist Selection Menu */}
      <Menu
        anchorEl={watchlistAnchorEl}
        open={Boolean(watchlistAnchorEl)}
        onClose={() => setWatchlistAnchorEl(null)}
        PaperProps={{
          sx: {
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: 220,
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setWatchlistAnchorEl(null);
            setCreateWatchlistOpen(true);
          }}
          sx={{ color: '#38BDF8', fontWeight: 600 }}
        >
          <ListItemIcon sx={{ color: '#38BDF8' }}>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          Create New Watchlist...
        </MenuItem>
        {watchlists.map((wl) => (
          <MenuItem
            key={wl.id}
            onClick={() => bulkWatchlistMutation.mutate({ watchlistId: wl.id })}
            sx={{ color: '#F8FAFC' }}
          >
            <ListItemIcon sx={{ color: '#E5A93C' }}>
              <PlaylistAddIcon fontSize="small" />
            </ListItemIcon>
            {wl.name} ({wl.movie_count ?? 0})
          </MenuItem>
        ))}
      </Menu>

      {/* Create New Watchlist Dialog */}
      <Dialog
        open={createWatchlistOpen}
        onClose={() => setCreateWatchlistOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: 320,
          },
        }}
      >
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700 }}>
          New Watchlist
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
            Create a new watchlist and add the {selectedIds.size} selected films into it:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="e.g. Christopher Nolan Favorites, Weekend Binge..."
            value={newWatchlistNameInput}
            onChange={(e) => setNewWatchlistNameInput(e.target.value)}
            sx={{
              input: { color: '#F8FAFC' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: '#E5A93C' },
                '&.Mui-focused fieldset': { borderColor: '#E5A93C' },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateWatchlistOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!newWatchlistNameInput.trim() || bulkWatchlistMutation.isPending}
            onClick={() => bulkWatchlistMutation.mutate({ newWatchlistName: newWatchlistNameInput.trim() })}
            sx={{ fontWeight: 700 }}
          >
            Create & Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Edit Tags & Genres Dialog */}
      <Dialog
        open={bulkTagsGenresOpen}
        onClose={() => setBulkTagsGenresOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 800, pb: 1 }}>
          Edit Tags & Genres ({selectedIds.size} {selectedIds.size === 1 ? 'title' : 'titles'} selected)
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          {/* Add / Remove Mode Switcher */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={bulkGenreMode}
              exclusive
              onChange={(_: React.MouseEvent<HTMLElement>, val: any) => {
                if (val) {
                  setBulkGenreMode(val);
                  setSelectedBulkTagIds(new Set());
                  setSelectedBulkGenreIds(new Set());
                }
              }}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: 2,
                p: 0.5,
                '& .MuiToggleButton-root': {
                  border: 'none',
                  px: 2.5,
                  py: 0.7,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: '#94A3B8',
                  borderRadius: 1.5,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    backgroundColor: bulkGenreMode === 'remove' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                    color: bulkGenreMode === 'remove' ? '#EF4444' : '#38BDF8',
                    border: bulkGenreMode === 'remove' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)',
                  },
                },
              }}
            >
              <ToggleButton value="add">➕ Apply / Add to Titles</ToggleButton>
              <ToggleButton value="remove">➖ Remove from Titles</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Tags Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ color: bulkGenreMode === 'remove' ? '#EF4444' : '#E5A93C', fontWeight: 700, mb: 1.2 }}>
              {bulkGenreMode === 'remove' ? 'SELECT TAGS TO REMOVE' : 'SELECT TAGS TO APPLY'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              {(tagsData || []).map((tag: any) => {
                const isSelected = selectedBulkTagIds.has(tag.id);
                const chipBg = isSelected
                  ? (bulkGenreMode === 'remove' ? 'rgba(239, 68, 68, 0.25)' : `${tag.color || '#E5A93C'}33`)
                  : 'transparent';
                const chipColor = isSelected
                  ? (bulkGenreMode === 'remove' ? '#EF4444' : '#FFF')
                  : (tag.color || '#E5A93C');
                const chipBorder = isSelected && bulkGenreMode === 'remove' ? '#EF4444' : (tag.color || '#E5A93C');

                return (
                  <Chip
                    key={tag.id}
                    label={`#${tag.name}`}
                    clickable
                    onClick={() => {
                      setSelectedBulkTagIds(prev => {
                        const next = new Set(prev);
                        if (next.has(tag.id)) next.delete(tag.id);
                        else next.add(tag.id);
                        return next;
                      });
                    }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      backgroundColor: chipBg,
                      color: chipColor,
                      borderColor: chipBorder,
                      fontWeight: 600,
                    }}
                  />
                );
              })}
              {(tagsData || []).length === 0 && (
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  No tags created yet.
                </Typography>
              )}
            </Box>
            {bulkGenreMode === 'add' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Create new tag (e.g. Mind Bending)..."
                  value={newTagNameInput}
                  onChange={(e) => setNewTagNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTagNameInput.trim()) {
                      createTagMutation.mutate(newTagNameInput.trim());
                    }
                  }}
                  sx={{
                    input: { color: '#F8FAFC', fontSize: '0.875rem' },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                      '&:hover fieldset': { borderColor: '#E5A93C' },
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!newTagNameInput.trim() || createTagMutation.isPending}
                  onClick={() => createTagMutation.mutate(newTagNameInput.trim())}
                  sx={{ color: '#E5A93C', borderColor: 'rgba(229,169,60,0.5)', whiteSpace: 'nowrap' }}
                >
                  Add Tag
                </Button>
              </Box>
            )}
          </Box>

          {/* Genres Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ color: bulkGenreMode === 'remove' ? '#EF4444' : '#38BDF8', fontWeight: 700, mb: 0.5 }}>
              {bulkGenreMode === 'remove' ? 'SELECT GENRES TO REMOVE' : 'SELECT GENRE TO APPLY'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1.5 }}>
              {bulkGenreMode === 'remove'
                ? 'Select genres to detach from selected titles.'
                : 'Each movie has only one genre. Selecting a new genre replaces the existing genre.'}
            </Typography>

            {/* Predefined Genres — single selection in apply mode */}
            {(genresData?.predefined || []).length > 0 && (
              <>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mb: 0.8, display: 'block' }}>
                  {bulkGenreMode === 'remove' ? 'PREDEFINED GENRES (click to mark for removal)' : 'PREDEFINED GENRES (select one)'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 2, maxHeight: 120, overflowY: 'auto', pr: 0.5 }}>
                  {(genresData?.predefined || []).map((pg: any) => {
                    const isSelected = selectedBulkGenreIds.has(pg.name);
                    const chipBg = isSelected
                      ? (bulkGenreMode === 'remove' ? 'rgba(239, 68, 68, 0.25)' : `${pg.color || '#38BDF8'}33`)
                      : 'transparent';
                    const chipColor = isSelected
                      ? (bulkGenreMode === 'remove' ? '#EF4444' : '#FFF')
                      : (pg.color || '#94A3B8');
                    const chipBorder = isSelected && bulkGenreMode === 'remove'
                      ? '#EF4444'
                      : (isSelected ? (pg.color || '#38BDF8') : `${pg.color || '#64748B'}55`);

                    return (
                      <Chip
                        key={pg.id || pg.name}
                        label={pg.name}
                        size="small"
                        clickable
                        onClick={() => {
                          setSelectedBulkGenreIds(prev => {
                            if (bulkGenreMode === 'remove') {
                              const next = new Set(prev);
                              if (next.has(pg.name)) next.delete(pg.name);
                              else next.add(pg.name);
                              return next;
                            } else {
                              if (prev.has(pg.name)) return new Set();
                              return new Set([pg.name]);
                            }
                          });
                        }}
                        variant={isSelected ? 'filled' : 'outlined'}
                        sx={{
                          backgroundColor: chipBg,
                          color: chipColor,
                          borderColor: chipBorder,
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.75rem',
                          height: 26,
                        }}
                      />
                    );
                  })}
                </Box>
              </>
            )}

            {/* Custom Genres — selectable */}
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mb: 0.8, display: 'block' }}>
              {bulkGenreMode === 'remove' ? 'YOUR CUSTOM GENRES (click to remove)' : 'YOUR CUSTOM GENRES (select one)'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
              {((genresData?.custom) || []).map((cg: any) => {
                const isSelected = selectedBulkGenreIds.has(cg.id);
                const chipBg = isSelected
                  ? (bulkGenreMode === 'remove' ? 'rgba(239, 68, 68, 0.25)' : `${cg.color || '#38BDF8'}33`)
                  : 'transparent';
                const chipColor = isSelected
                  ? (bulkGenreMode === 'remove' ? '#EF4444' : '#FFF')
                  : (cg.color || '#38BDF8');
                const chipBorder = isSelected && bulkGenreMode === 'remove' ? '#EF4444' : (cg.color || '#38BDF8');

                return (
                  <Chip
                    key={cg.id}
                    label={cg.name}
                    clickable
                    onClick={() => {
                      setSelectedBulkGenreIds(prev => {
                        if (bulkGenreMode === 'remove') {
                          const next = new Set(prev);
                          if (next.has(cg.id)) next.delete(cg.id);
                          else next.add(cg.id);
                          return next;
                        } else {
                          if (prev.has(cg.id)) return new Set();
                          return new Set([cg.id]);
                        }
                      });
                    }}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      backgroundColor: chipBg,
                      color: chipColor,
                      borderColor: chipBorder,
                      fontWeight: 600,
                    }}
                  />
                );
              })}
              {((genresData?.custom) || []).length === 0 && (
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  No custom genres created yet.
                </Typography>
              )}
            </Box>

            {bulkGenreMode === 'add' && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Create new custom genre (e.g. Cyberpunk)..."
                  value={newGenreNameInput}
                  onChange={(e) => setNewGenreNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newGenreNameInput.trim()) {
                      createGenreMutation.mutate(newGenreNameInput.trim());
                    }
                  }}
                  sx={{
                    input: { color: '#F8FAFC', fontSize: '0.875rem' },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                      '&:hover fieldset': { borderColor: '#38BDF8' },
                    },
                  }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!newGenreNameInput.trim() || createGenreMutation.isPending}
                  onClick={() => createGenreMutation.mutate(newGenreNameInput.trim())}
                  sx={{ color: '#38BDF8', borderColor: 'rgba(56,189,248,0.5)', whiteSpace: 'nowrap' }}
                >
                  Add Genre
                </Button>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkTagsGenresOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={bulkGenreMode === 'remove' ? 'error' : 'primary'}
            disabled={
              (selectedBulkTagIds.size === 0 && selectedBulkGenreIds.size === 0) ||
              bulkTagsGenresMutation.isPending
            }
            onClick={() => bulkTagsGenresMutation.mutate()}
            sx={{ fontWeight: 700 }}
          >
            {bulkTagsGenresMutation.isPending
              ? (bulkGenreMode === 'remove' ? 'Removing...' : 'Applying...')
              : `${bulkGenreMode === 'remove' ? 'Remove from' : 'Apply to'} ${selectedIds.size} ${selectedIds.size === 1 ? 'Title' : 'Titles'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advanced Filter Bar */}
      <FilterBar
        status={status}
        onStatusChange={setStatus}
        selectedMediaType={mediaType}
        onMediaTypeChange={setMediaType}
        selectedGenre={genreId}
        onGenreChange={setGenreId}
        selectedOtt={ott}
        onOttChange={setOtt}
        selectedLanguage={language}
        onLanguageChange={setLanguage}
        selectedTag={tagId}
        onTagChange={setTagId}
        isFavorite={isFavorite}
        onFavoriteToggle={() => setIsFavorite(!isFavorite)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        availableTags={tagsData || []}
        availableGenres={genresData}
        onReset={() => {
          setStatus('all');
          setMediaType('all');
          setGenreId(undefined);
          setOtt(undefined);
          setLanguage(undefined);
          setTagId(undefined);
          setIsFavorite(false);
          setSortBy('added_at');
          setSearchParams({});
        }}
      />

      {/* Movies Content */}
      {isLoading ? (
        <SkeletonGrid count={12} />
      ) : movies.length > 0 ? (
        viewMode === 'grid' ? (
          <Grid container spacing={2.5}>
            {movies.map((movie: any) => {
              const isSelected = selectedIds.has(movie.user_movie_id);
              return (
                <Grid item xs={6} sm={4} md={3} lg={2} key={movie.user_movie_id}>
                  <Box sx={{ position: 'relative' }}>
                    {isBulkMode && (
                      <Box sx={{ position: 'absolute', top: 8, left: 8, zIndex: 10 }}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(movie.user_movie_id)}
                          sx={{
                            color: '#FFF',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            borderRadius: '4px',
                            p: 0.5,
                            '&.Mui-checked': { color: '#38BDF8', backgroundColor: 'rgba(0,0,0,0.8)' },
                          }}
                        />
                      </Box>
                    )}
                    <MovieCard movie={movie} selectedOtt={ott} />
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Stack spacing={1.5}>
            {movies.map((movie: any) => {
              const isSelected = selectedIds.has(movie.user_movie_id);
              const posterUrl = movie.poster_path
                ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w200${movie.poster_path}`)
                : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=200&q=80';
              const year = movie.release_date ? movie.release_date.substring(0, 4) : '';
              const primarySource = (movie.sources || []).find((s: any) => s.source_type === 'ott' || s.source_type === 'google_drive' || s.source_type === 'youtube') ||
                (movie.sources && movie.sources.length > 0 ? movie.sources[0] : null);

              return (
                <Paper
                  key={movie.user_movie_id}
                  onClick={() => navigate(`/movies/${movie.user_movie_id}`)}
                  sx={{
                    p: 1.5,
                    backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.08)' : '#0B0F19',
                    border: isSelected ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.07)',
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                      borderColor: isSelected ? '#38BDF8' : 'rgba(255, 255, 255, 0.16)',
                      transform: 'translateY(-1px)',
                    },
                  }}
                >
                  {isBulkMode && (
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleToggleSelect(movie.user_movie_id)}
                      sx={{ color: '#64748B', '&.Mui-checked': { color: '#38BDF8' } }}
                    />
                  )}

                  {/* Thumbnail Poster */}
                  <Box
                    component="img"
                    src={posterUrl}
                    alt={movie.title}
                    sx={{
                      width: 52,
                      height: 78,
                      objectFit: 'cover',
                      borderRadius: 1.5,
                      flexShrink: 0,
                      backgroundColor: '#1E293B',
                    }}
                  />

                  {/* Title & Details */}
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Typography variant="subtitle1" noWrap sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                        {movie.title}
                      </Typography>
                      {movie.media_type === 'tv' && (
                        <Chip label="Series" size="small" sx={{ height: 20, fontSize: '0.65rem', backgroundColor: 'rgba(56,189,248,0.15)', color: '#38BDF8', fontWeight: 700 }} />
                      )}
                      {movie.is_favorite && (
                        <FavoriteIcon sx={{ fontSize: 16, color: '#EF4444' }} />
                      )}
                    </Box>

                    <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 0.8 }}>
                      {year ? `${year} • ` : ''}
                      {movie.media_type === 'tv'
                        ? (movie.number_of_seasons ? `${movie.number_of_seasons} Seasons` : 'TV Series')
                        : (movie.runtime ? `${movie.runtime} mins` : 'Movie')}
                      {movie.original_language ? ` • ${movie.original_language.toUpperCase()}` : ''}
                    </Typography>

                    {/* Genres and Tags */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, flexWrap: 'wrap' }}>
                      {(() => {
                        const g = (movie.genres || [])[0];
                        if (!g) return null;
                        return (
                          <Chip
                            key={g.id || g.name}
                            label={g.name}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              backgroundColor: `${g.color || '#38BDF8'}18`,
                              color: g.color || '#38BDF8',
                              borderColor: `${g.color || '#38BDF8'}40`,
                              fontWeight: 600,
                            }}
                            variant="outlined"
                          />
                        );
                      })()}
                      {(movie.tags || []).slice(0, 2).map((t: any) => (
                        <Chip
                          key={t.id || t.name}
                          label={`#${t.name}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            backgroundColor: `${t.color || '#E5A93C'}18`,
                            color: t.color || '#E5A93C',
                            borderColor: `${t.color || '#E5A93C'}40`,
                          }}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Rating Badge */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, px: 1 }}>
                    <StarIcon sx={{ fontSize: 18, color: movie.personal_rating ? '#E5A93C' : '#64748B' }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: movie.personal_rating ? '#E5A93C' : '#94A3B8' }}>
                      {movie.personal_rating != null && !isNaN(Number(movie.personal_rating))
                        ? Number(movie.personal_rating).toFixed(1)
                        : (movie.vote_average != null && !isNaN(Number(movie.vote_average))
                            ? Number(movie.vote_average).toFixed(1)
                            : '-')}
                    </Typography>
                  </Box>

                  {/* Watch Status */}
                  <Box sx={{ flexShrink: 0 }}>
                    <Chip
                      label={movie.watch_status === 'watched' ? 'Watched' : movie.watch_status === 'watching' ? 'Watching' : 'Unwatched'}
                      size="small"
                      color={movie.watch_status === 'watched' ? 'success' : movie.watch_status === 'watching' ? 'warning' : 'default'}
                      variant={movie.watch_status === 'watched' ? 'filled' : 'outlined'}
                      sx={{ height: 24, fontSize: '0.72rem', fontWeight: 600 }}
                    />
                  </Box>

                  {/* Play Action */}
                  <Box sx={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      variant="contained"
                      color={movie.playback_position_sec && movie.playback_position_sec > 0 && movie.watch_status !== 'watched' ? 'secondary' : 'primary'}
                      startIcon={<PlayCircleOutlineIcon />}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (primarySource && isYouTubeSource(primarySource)) {
                          openPlayer(movie, primarySource);
                        } else if (primarySource?.source_type === 'google_drive') {
                          openPlayer(movie, primarySource);
                        } else if (primarySource?.source_type === 'ott' && primarySource.external_url) {
                          window.open(primarySource.external_url, '_blank', 'noopener,noreferrer');
                        } else if (movie.trailer_url) {
                          openPlayer(movie);
                        } else {
                          navigate(`/movies/${movie.user_movie_id}`);
                        }
                      }}
                      sx={{ fontWeight: 700, fontSize: '0.75rem', px: 1.8, py: 0.5 }}
                    >
                      {movie.playback_position_sec && movie.playback_position_sec > 0 && movie.watch_status !== 'watched'
                        ? `Resume (${movie.last_played_time_formatted || `${Math.floor(movie.playback_position_sec / 60)}m`})`
                        : primarySource && isYouTubeSource(primarySource)
                        ? 'Play YouTube'
                        : 'Play'}
                    </Button>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )
      ) : (
        <EmptyState
          icon={<MovieFilterIcon />}
          title="No movies found"
          description={
            searchTerm
              ? `No movies in your sanctuary match "${searchTerm}". Remember: Search My Movies only queries films already added to your library.`
              : 'Try adjusting your filters or import new films into your sanctuary.'
          }
          actionLabel="Reset Filters"
          onAction={() => {
            setStatus('all');
            setGenreId(undefined);
            setTagId(undefined);
            setIsFavorite(false);
            setSearchParams({});
          }}
        />
      )}
    </Box>
  );
};
