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
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { FilterBar } from '../../components/common/FilterBar.js';
import { SkeletonGrid } from '../../components/feedback/SkeletonGrid.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';

export const MyMoviesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [status, setStatus] = useState<string>('all');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [genreId, setGenreId] = useState<string | number | undefined>(undefined);
  const [language, setLanguage] = useState<string | undefined>(undefined);
  const [tagId, setTagId] = useState<string | undefined>(undefined);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('added_at');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [watchlistAnchorEl, setWatchlistAnchorEl] = useState<null | HTMLElement>(null);
  const [createWatchlistOpen, setCreateWatchlistOpen] = useState(false);
  const [newWatchlistNameInput, setNewWatchlistNameInput] = useState('');
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);

  const searchTerm = searchParams.get('search') || '';

  // Query Movies
  const { data, isLoading } = useQuery({
    queryKey: ['my-movies', { status, mediaType, genreId, language, tagId, isFavorite, sortBy, search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status !== 'all') params.append('status', status);
      if (mediaType !== 'all') params.append('mediaType', mediaType);
      if (genreId !== undefined && genreId !== null) params.append('genreId', genreId.toString());
      if (language) params.append('language', language);
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

          <ButtonGroup size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
            <Button
              onClick={() => setViewMode('grid')}
              sx={{ color: viewMode === 'grid' ? '#E5A93C' : '#64748B' }}
            >
              <GridViewIcon fontSize="small" />
            </Button>
            <Button
              onClick={() => setViewMode('list')}
              sx={{ color: viewMode === 'list' ? '#E5A93C' : '#64748B' }}
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

      {/* Advanced Filter Bar */}
      <FilterBar
        status={status}
        onStatusChange={setStatus}
        selectedMediaType={mediaType}
        onMediaTypeChange={setMediaType}
        selectedGenre={genreId}
        onGenreChange={setGenreId}
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
                  <MovieCard movie={movie} />
                </Box>
              </Grid>
            );
          })}
        </Grid>
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
