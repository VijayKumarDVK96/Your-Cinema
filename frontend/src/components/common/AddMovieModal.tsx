import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Grid,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import MovieIcon from '@mui/icons-material/Movie';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { api } from '../../api/client.js';

interface AddMovieModalProps {
  open: boolean;
  onClose: () => void;
  onMovieAdded?: () => void;
  initialQuery?: string;
}

export const AddMovieModal: React.FC<AddMovieModalProps> = ({ open, onClose, onMovieAdded, initialQuery = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialQuery) {
      setSearchTerm(initialQuery);
      handleSearch(undefined, undefined, initialQuery);
    } else if (open && !initialQuery) {
      setSearchTerm('');
      setResults([]);
    }
  }, [open, initialQuery]);

  const handleSearch = async (e?: React.FormEvent, overrideType?: 'all' | 'movie' | 'tv', overrideQuery?: string) => {
    if (e) e.preventDefault();
    const query = (overrideQuery !== undefined ? overrideQuery : searchTerm).trim();
    if (!query) return;

    const activeType = overrideType || mediaType;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/tmdb/search?query=${encodeURIComponent(searchTerm.trim())}&type=${activeType}`);
      setResults(res.data?.data?.results || []);
    } catch (err: any) {
      setError(err.message || 'Could not retrieve TMDB search results.');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (_: any, newType: 'all' | 'movie' | 'tv' | null) => {
    if (!newType) return;
    setMediaType(newType);
    if (searchTerm.trim()) {
      handleSearch(undefined, newType);
    }
  };

  const handleAdd = async (item: any) => {
    try {
      const type = item.media_type || (mediaType === 'tv' ? 'tv' : 'movie');
      await api.post('/movies', { tmdb_id: item.id, media_type: type });
      setAddedIds((prev) => new Set(prev).add(item.id));
      if (onMovieAdded) onMovieAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to add to your library.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0F141F',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Add Movies & Web Series
          </Typography>
          <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 600 }}>
            IMPORT FROM TMDB TO YOUR PERSONAL SANCTUARY
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#94A3B8' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Type Filter & Search Bar */}
        <Box sx={{ mb: 2, mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <ToggleButtonGroup
            value={mediaType}
            exclusive
            onChange={handleTypeChange}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 2,
              '& .MuiToggleButton-root': {
                color: '#94A3B8',
                px: 2,
                py: 0.5,
                fontWeight: 600,
                textTransform: 'none',
                gap: 0.75,
                '&.Mui-selected': {
                  color: '#F8FAFC',
                  backgroundColor: 'rgba(229, 169, 60, 0.2)',
                  borderColor: '#E5A93C',
                },
              },
            }}
          >
            <ToggleButton value="all">
              <AutoAwesomeIcon sx={{ fontSize: '1rem', color: '#E5A93C' }} /> All Formats
            </ToggleButton>
            <ToggleButton value="movie">
              <MovieIcon sx={{ fontSize: '1rem', color: '#38BDF8' }} /> Movies
            </ToggleButton>
            <ToggleButton value="tv">
              <LiveTvIcon sx={{ fontSize: '1rem', color: '#A855F7' }} /> Web Series & TV
            </ToggleButton>
          </ToggleButtonGroup>

          <Box component="form" onSubmit={handleSearch}>
            <TextField
              fullWidth
              placeholder={
                mediaType === 'tv'
                  ? "Search by title, TMDB ID, or paste TMDB URL (e.g. Dark, Breaking Bad, 1399)..."
                  : mediaType === 'movie'
                  ? "Search by title, TMDB ID, or paste TMDB URL (e.g. Don, Interstellar, 810793)..."
                  : "Search by title, TMDB ID, or paste TMDB URL (e.g. Don, Interstellar, Breaking Bad)..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#E5A93C' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={loading || !searchTerm.trim()}
                      sx={{ fontWeight: 700 }}
                    >
                      {loading ? <CircularProgress size={20} color="inherit" /> : 'Search TMDB'}
                    </Button>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>

        {error && (
          <Alert severity="warning" sx={{ mb: 2, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            {error}
          </Alert>
        )}

        {/* Results Grid */}
        {results.length > 0 && (
          <Grid container spacing={2} sx={{ maxHeight: '480px', overflowY: 'auto', pr: 0.5 }}>
            {results.map((item) => {
              const isAdded = addedIds.has(item.id);
              const poster = item.poster_path
                ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
                : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
              const year = item.release_date ? item.release_date.substring(0, 4) : '';

              return (
                <Grid item xs={12} sm={6} key={item.id}>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 1.5,
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      alignItems: 'center',
                    }}
                  >
                    <Box
                      component="img"
                      src={poster}
                      alt={item.title}
                      sx={{ width: 60, height: 90, objectFit: 'cover', borderRadius: 1.5 }}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: 700,
                            color: '#F8FAFC',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.title}
                        </Typography>
                        {item.media_type === 'tv' && (
                          <Chip
                            label="SERIES"
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              backgroundColor: 'rgba(168, 85, 247, 0.2)',
                              color: '#C084FC',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1 }}>
                        {item.media_type === 'tv' ? (item.number_of_seasons ? `${item.number_of_seasons} Seasons • ` : 'Series • ') : ''}
                        {year} • TMDB {item.vote_average != null && !isNaN(Number(item.vote_average)) ? Number(item.vote_average).toFixed(1) : '-'}
                      </Typography>

                      <Button
                        size="small"
                        variant={isAdded ? 'outlined' : 'contained'}
                        color={isAdded ? 'success' : 'primary'}
                        startIcon={isAdded ? <CheckCircleIcon /> : <AddCircleOutlineIcon />}
                        disabled={isAdded}
                        onClick={() => handleAdd(item)}
                        sx={{ fontSize: '0.75rem', py: 0.4 }}
                      >
                        {isAdded ? 'Added' : (item.media_type === 'tv' ? 'Add Series' : 'Add to Library')}
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}

        {results.length === 0 && !loading && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Search for any movie to enrich metadata and add it to your personal sanctuary.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
