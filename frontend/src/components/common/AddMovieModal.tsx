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
  Rating,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import MovieIcon from '@mui/icons-material/Movie';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import StarIcon from '@mui/icons-material/Star';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import CategoryIcon from '@mui/icons-material/Category';
import TuneIcon from '@mui/icons-material/Tune';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { WatchlistTreeSelect } from './WatchlistTreeSelect.js';

interface AddMovieModalProps {
  open: boolean;
  onClose: () => void;
  onMovieAdded?: () => void;
  initialQuery?: string;
}

interface ItemCustomOptions {
  watchStatus: 'unwatched' | 'watching' | 'watched';
  isFavorite: boolean;
  rating: number | null;
  genre: string;
  watchlistId: string;
}

export const AddMovieModal: React.FC<AddMovieModalProps> = ({ open, onClose, onMovieAdded, initialQuery = '' }) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  // Global default preset controls
  const [defaultWatchStatus, setDefaultWatchStatus] = useState<'unwatched' | 'watching' | 'watched'>('unwatched');
  const [defaultIsFavorite, setDefaultIsFavorite] = useState(false);
  const [defaultRating, setDefaultRating] = useState<number | null>(null);
  const [defaultGenre, setDefaultGenre] = useState<string>('');
  const [defaultWatchlistId, setDefaultWatchlistId] = useState<string>('');
  const [showDefaultSettings, setShowDefaultSettings] = useState(false);

  // Per-item override options map
  const [itemOptions, setItemOptions] = useState<Record<number, ItemCustomOptions>>({});
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Fetch all genres
  const { data: genresData } = useQuery({
    queryKey: ['genres', 'add-modal'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return res.data?.data;
    },
    enabled: open,
  });

  // Fetch all watchlists
  const { data: watchlistsData } = useQuery({
    queryKey: ['all-watchlists-flat', 'add-modal'],
    queryFn: async () => {
      const res = await api.get('/watchlists?parentId=all&limit=1000');
      return res.data?.data;
    },
    enabled: open,
  });

  const predefinedGenres: any[] = genresData?.predefined || [];
  const customGenres: any[] = genresData?.custom || [];
  const allGenresList = [
    ...predefinedGenres.map((g: any) => ({ id: g.id || g.name, name: g.name, color: g.color || '#38BDF8', isPredefined: true })),
    ...customGenres.map((g: any) => ({ id: g.id || g.name, name: g.name, color: g.color || '#C084FC', isPredefined: false })),
  ];

  const flatWatchlists: any[] = Array.isArray(watchlistsData)
    ? watchlistsData
    : watchlistsData?.watchlists || [];
  const selectableWatchlists = flatWatchlists.filter((w: any) => !w.is_system);

  useEffect(() => {
    if (open && initialQuery) {
      setSearchTerm(initialQuery);
      handleSearch(undefined, undefined, initialQuery);
    } else if (open && !initialQuery) {
      setSearchTerm('');
      setResults([]);
      setAddedIds(new Set());
      setItemOptions({});
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
      const res = await api.get(`/tmdb/search?query=${encodeURIComponent(query)}&type=${activeType}`);
      const list = res.data?.data?.results || [];
      setResults(list);

      // Initialize item options with defaults
      const initialMap: Record<number, ItemCustomOptions> = {};
      list.forEach((item: any) => {
        initialMap[item.id] = {
          watchStatus: defaultWatchStatus,
          isFavorite: defaultIsFavorite,
          rating: defaultRating,
          genre: defaultGenre || (item.genre_ids && item.genre_ids[0] ? String(item.genre_ids[0]) : ''),
          watchlistId: defaultWatchlistId,
        };
      });
      setItemOptions((prev) => ({ ...initialMap, ...prev }));
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

  const updateItemOption = (itemId: number, key: keyof ItemCustomOptions, value: any) => {
    setItemOptions((prev) => {
      const curr = prev[itemId] || {
        watchStatus: defaultWatchStatus,
        isFavorite: defaultIsFavorite,
        rating: defaultRating,
        genre: defaultGenre,
        watchlistId: defaultWatchlistId,
      };
      return {
        ...prev,
        [itemId]: {
          ...curr,
          [key]: value,
        },
      };
    });
  };

  const handleAdd = async (item: any) => {
    const opts = itemOptions[item.id] || {
      watchStatus: defaultWatchStatus,
      isFavorite: defaultIsFavorite,
      rating: defaultRating,
      genre: defaultGenre,
      watchlistId: defaultWatchlistId,
    };

    setAddingId(item.id);
    setError(null);
    try {
      const type = item.media_type || (mediaType === 'tv' ? 'tv' : 'movie');
      await api.post('/movies', {
        tmdb_id: item.id,
        media_type: type,
        watch_status: opts.watchStatus,
        personal_rating: opts.rating !== null ? opts.rating : null,
        is_favorite: opts.isFavorite,
        assigned_genre: opts.genre || undefined,
        watchlist_ids: opts.watchlistId ? [opts.watchlistId] : undefined,
      });

      setAddedIds((prev) => new Set(prev).add(item.id));
      if (onMovieAdded) onMovieAdded();
    } catch (err: any) {
      setError(err.message || 'Failed to add to your library.');
    } finally {
      setAddingId(null);
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
          backgroundColor: '#0A0E17',
          backgroundImage: 'radial-gradient(ellipse at top, rgba(229, 169, 60, 0.08) 0%, rgba(10, 14, 23, 0.98) 70%)',
          border: '1px solid rgba(229, 169, 60, 0.25)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px -10px rgba(229, 169, 60, 0.15)',
          borderRadius: 3.5,
          p: 1.5,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, pt: 1.5, px: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ color: '#F8FAFC', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 1 }}>
            Add Movies & Web Series
          </Typography>
          <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Import from TMDB with Watchlist, Genre, Rating & Watch Status
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: '#94A3B8',
            '&:hover': { color: '#F8FAFC', backgroundColor: 'rgba(255, 255, 255, 0.08)' },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, pb: 2 }}>
        {/* Search Bar & Type Filter */}
        <Box sx={{ mb: 2, mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <ToggleButtonGroup
              value={mediaType}
              exclusive
              onChange={handleTypeChange}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                '& .MuiToggleButton-root': {
                  color: '#94A3B8',
                  px: 2,
                  py: 0.6,
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  gap: 0.75,
                  '&.Mui-selected': {
                    color: '#F8FAFC',
                    backgroundColor: 'rgba(229, 169, 60, 0.22)',
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

            <Button
              size="small"
              variant="outlined"
              startIcon={<TuneIcon sx={{ color: '#E5A93C' }} />}
              endIcon={showDefaultSettings ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowDefaultSettings((prev) => !prev)}
              sx={{
                borderColor: showDefaultSettings ? '#E5A93C' : 'rgba(255, 255, 255, 0.12)',
                color: showDefaultSettings ? '#E5A93C' : '#94A3B8',
                backgroundColor: showDefaultSettings ? 'rgba(229, 169, 60, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.78rem',
                borderRadius: 2,
                '&:hover': {
                  borderColor: '#E5A93C',
                  backgroundColor: 'rgba(229, 169, 60, 0.12)',
                },
              }}
            >
              Default Tagging & Watchlist Preset
            </Button>
          </Box>

          {/* Collapsible Default Preset Settings */}
          <Collapse in={showDefaultSettings}>
            <Box
              sx={{
                p: 2,
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(229, 169, 60, 0.25)',
                borderRadius: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 800, letterSpacing: '0.05em' }}>
                GLOBAL DEFAULTS APPLIED WHEN ADDING TITLES:
              </Typography>

              <Grid container spacing={2} alignItems="center">
                {/* Watch Status */}
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#94A3B8', fontSize: '0.85rem' }}>Watch Status</InputLabel>
                    <Select
                      value={defaultWatchStatus}
                      label="Watch Status"
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setDefaultWatchStatus(val);
                        setItemOptions((prev) => {
                          const updated = { ...prev };
                          Object.keys(updated).forEach((id) => {
                            updated[Number(id)] = { ...updated[Number(id)], watchStatus: val };
                          });
                          return updated;
                        });
                      }}
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        color: '#F8FAFC',
                        borderRadius: 2,
                        fontSize: '0.85rem',
                      }}
                    >
                      <MenuItem value="unwatched">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <VisibilityOffIcon sx={{ fontSize: 16, color: '#94A3B8' }} /> Unwatched
                        </Box>
                      </MenuItem>
                      <MenuItem value="watching">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AutoAwesomeIcon sx={{ fontSize: 16, color: '#38BDF8' }} /> Watching
                        </Box>
                      </MenuItem>
                      <MenuItem value="watched">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <VisibilityIcon sx={{ fontSize: 16, color: '#10B981' }} /> Watched
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Genre Selector */}
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#94A3B8', fontSize: '0.85rem' }}>Genre</InputLabel>
                    <Select
                      value={defaultGenre}
                      label="Genre"
                      onChange={(e) => {
                        const val = e.target.value;
                        setDefaultGenre(val);
                        setItemOptions((prev) => {
                          const updated = { ...prev };
                          Object.keys(updated).forEach((id) => {
                            updated[Number(id)] = { ...updated[Number(id)], genre: val };
                          });
                          return updated;
                        });
                      }}
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                        color: '#F8FAFC',
                        borderRadius: 2,
                        fontSize: '0.85rem',
                      }}
                    >
                      <MenuItem value="">
                        <em>Auto TMDB Genre</em>
                      </MenuItem>
                      {allGenresList.map((g) => (
                        <MenuItem key={g.id} value={g.name}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: g.color,
                              }}
                            />
                            {g.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Watchlist Selector */}
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mb: 0.5, display: 'block' }}>
                      Watchlist
                    </Typography>
                    <WatchlistTreeSelect
                      value={defaultWatchlistId || 'none'}
                      onChange={(newId) => {
                        const actualId = newId === 'none' || newId === '__new__' ? '' : newId;
                        setDefaultWatchlistId(actualId);
                        setItemOptions((prev) => {
                          const updated = { ...prev };
                          Object.keys(updated).forEach((id) => {
                            updated[Number(id)] = { ...updated[Number(id)], watchlistId: actualId };
                          });
                          return updated;
                        });
                      }}
                      watchlists={selectableWatchlists}
                      noneLabel="None (Unassigned)"
                      allowCreateNew={false}
                      minWidth="100%"
                    />
                  </Box>
                </Grid>

                {/* Rating & Favorite */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600, fontSize: '0.82rem' }}>
                      Rating:
                    </Typography>
                    <Rating
                      value={defaultRating}
                      precision={0.5}
                      onChange={(_, newVal) => {
                        setDefaultRating(newVal);
                        setItemOptions((prev) => {
                          const updated = { ...prev };
                          Object.keys(updated).forEach((id) => {
                            updated[Number(id)] = { ...updated[Number(id)], rating: newVal };
                          });
                          return updated;
                        });
                      }}
                      emptyIcon={<StarIcon style={{ opacity: 0.25, color: '#fff' }} fontSize="inherit" />}
                      sx={{ color: '#E5A93C' }}
                    />
                    {defaultRating !== null && (
                      <Button
                        size="small"
                        onClick={() => setDefaultRating(null)}
                        sx={{ color: '#64748B', fontSize: '0.7rem', minWidth: 'auto', p: 0.5 }}
                      >
                        Clear
                      </Button>
                    )}
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      size="small"
                      variant={defaultIsFavorite ? 'contained' : 'outlined'}
                      color="secondary"
                      startIcon={defaultIsFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                      onClick={() => {
                        const newFav = !defaultIsFavorite;
                        setDefaultIsFavorite(newFav);
                        setItemOptions((prev) => {
                          const updated = { ...prev };
                          Object.keys(updated).forEach((id) => {
                            updated[Number(id)] = { ...updated[Number(id)], isFavorite: newFav };
                          });
                          return updated;
                        });
                      }}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        borderRadius: 2,
                      }}
                    >
                      {defaultIsFavorite ? 'Preset: Marked Favorite' : 'Preset: Not Favorite'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          {/* Search Input */}
          <Box component="form" onSubmit={handleSearch}>
            <TextField
              fullWidth
              placeholder={
                mediaType === 'tv'
                  ? 'Search by TV Series title, TMDB ID, or paste URL (e.g. Breaking Bad, 1399)...'
                  : mediaType === 'movie'
                  ? 'Search by Movie title, TMDB ID, or paste URL (e.g. Interstellar, 810793)...'
                  : 'Search by title, TMDB ID, or paste TMDB URL (e.g. Don, Interstellar, Breaking Bad)...'
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
                      sx={{ fontWeight: 700, borderRadius: 1.5, px: 2.5 }}
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
          <Grid container spacing={2} sx={{ maxHeight: '520px', overflowY: 'auto', pr: 0.5, mt: 0.5 }}>
            {results.map((item) => {
              const isAdded = addedIds.has(item.id);
              const isAdding = addingId === item.id;
              const isExpanded = expandedItemId === item.id;
              const poster = item.poster_path
                ? `https://image.tmdb.org/t/p/w300${item.poster_path}`
                : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=300&q=80';
              const year = item.release_date
                ? item.release_date.substring(0, 4)
                : item.first_air_date
                ? item.first_air_date.substring(0, 4)
                : '';

              const currentOpts = itemOptions[item.id] || {
                watchStatus: defaultWatchStatus,
                isFavorite: defaultIsFavorite,
                rating: defaultRating,
                genre: defaultGenre,
                watchlistId: defaultWatchlistId,
              };

              return (
                <Grid item xs={12} key={item.id}>
                  <Box
                    sx={{
                      p: 1.75,
                      backgroundColor: 'rgba(255, 255, 255, 0.025)',
                      border: isAdded
                        ? '1px solid rgba(16, 185, 129, 0.4)'
                        : isExpanded
                        ? '1px solid rgba(229, 169, 60, 0.4)'
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: isAdded ? 'rgba(16, 185, 129, 0.6)' : 'rgba(229, 169, 60, 0.35)',
                        backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      },
                    }}
                  >
                    {/* Top row: Poster + Title + Summary + Actions */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box
                        component="img"
                        src={poster}
                        alt={item.title || item.name}
                        sx={{
                          width: 68,
                          height: 100,
                          objectFit: 'cover',
                          borderRadius: 2,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          flexShrink: 0,
                        }}
                      />

                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 800,
                              color: '#F8FAFC',
                              fontSize: '1.05rem',
                              lineHeight: 1.2,
                            }}
                          >
                            {item.title || item.name}
                          </Typography>
                          {(item.media_type === 'tv' || (!item.title && item.name)) && (
                            <Chip
                              label="SERIES"
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                backgroundColor: 'rgba(168, 85, 247, 0.2)',
                                color: '#C084FC',
                                border: '1px solid rgba(168, 85, 247, 0.4)',
                              }}
                            />
                          )}
                        </Box>

                        <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1, fontSize: '0.78rem' }}>
                          {item.media_type === 'tv' ? (item.number_of_seasons ? `${item.number_of_seasons} Seasons • ` : 'Series • ') : ''}
                          {year ? `${year} • ` : ''}TMDB ★ {item.vote_average != null && !isNaN(Number(item.vote_average)) ? Number(item.vote_average).toFixed(1) : '-'}
                        </Typography>

                        {/* Badges / Active Configuration overview */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                          <Chip
                            size="small"
                            icon={
                              currentOpts.watchStatus === 'watched' ? (
                                <VisibilityIcon sx={{ fontSize: '0.85rem !important' }} />
                              ) : currentOpts.watchStatus === 'watching' ? (
                                <AutoAwesomeIcon sx={{ fontSize: '0.85rem !important' }} />
                              ) : (
                                <VisibilityOffIcon sx={{ fontSize: '0.85rem !important' }} />
                              )
                            }
                            label={
                              currentOpts.watchStatus === 'watched'
                                ? 'Watched'
                                : currentOpts.watchStatus === 'watching'
                                ? 'Watching'
                                : 'Unwatched'
                            }
                            sx={{
                              height: 22,
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor:
                                currentOpts.watchStatus === 'watched'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : currentOpts.watchStatus === 'watching'
                                  ? 'rgba(56, 189, 248, 0.15)'
                                  : 'rgba(255, 255, 255, 0.05)',
                              color:
                                currentOpts.watchStatus === 'watched'
                                  ? '#34D399'
                                  : currentOpts.watchStatus === 'watching'
                                  ? '#38BDF8'
                                  : '#94A3B8',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          />

                          {currentOpts.isFavorite && (
                            <Chip
                              size="small"
                              icon={<FavoriteIcon sx={{ fontSize: '0.8rem !important', color: '#F43F5E' }} />}
                              label="Favorite"
                              sx={{
                                height: 22,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                                color: '#FDA4AF',
                                border: '1px solid rgba(244, 63, 94, 0.3)',
                              }}
                            />
                          )}

                          {currentOpts.rating !== null && currentOpts.rating > 0 && (
                            <Chip
                              size="small"
                              icon={<StarIcon sx={{ fontSize: '0.8rem !important', color: '#E5A93C' }} />}
                              label={`${currentOpts.rating} ★`}
                              sx={{
                                height: 22,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: 'rgba(229, 169, 60, 0.15)',
                                color: '#FCD34D',
                                border: '1px solid rgba(229, 169, 60, 0.3)',
                              }}
                            />
                          )}

                          {currentOpts.genre && (
                            <Chip
                              size="small"
                              icon={<CategoryIcon sx={{ fontSize: '0.8rem !important', color: '#38BDF8' }} />}
                              label={currentOpts.genre}
                              sx={{
                                height: 22,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                                color: '#7DD3FC',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                              }}
                            />
                          )}

                          {currentOpts.watchlistId && (
                            <Chip
                              size="small"
                              icon={<PlaylistPlayIcon sx={{ fontSize: '0.85rem !important', color: '#A855F7' }} />}
                              label={
                                selectableWatchlists.find((w: any) => w.id === currentOpts.watchlistId)?.name || 'Watchlist'
                              }
                              sx={{
                                height: 22,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                                color: '#D8B4FE',
                                border: '1px solid rgba(168, 85, 247, 0.3)',
                              }}
                            />
                          )}
                        </Box>

                        {/* Action buttons */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                          <Button
                            size="small"
                            variant={isAdded ? 'outlined' : 'contained'}
                            color={isAdded ? 'success' : 'primary'}
                            startIcon={
                              isAdding ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : isAdded ? (
                                <CheckCircleIcon />
                              ) : (
                                <AddCircleOutlineIcon />
                              )
                            }
                            disabled={isAdded || isAdding}
                            onClick={() => handleAdd(item)}
                            sx={{
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              py: 0.6,
                              px: 2,
                              borderRadius: 2,
                            }}
                          >
                            {isAdded ? 'Added to Sanctuary' : item.media_type === 'tv' ? 'Add Series' : 'Add to Library'}
                          </Button>

                          <Button
                            size="small"
                            variant="text"
                            startIcon={<TuneIcon sx={{ fontSize: 16 }} />}
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            sx={{
                              fontSize: '0.75rem',
                              color: isExpanded ? '#E5A93C' : '#94A3B8',
                              fontWeight: 700,
                              textTransform: 'none',
                              '&:hover': { color: '#F8FAFC' },
                            }}
                          >
                            {isExpanded ? 'Hide Options' : 'Customize Options'}
                          </Button>
                        </Box>
                      </Box>
                    </Box>

                    {/* Collapsible item customization panel */}
                    <Collapse in={isExpanded}>
                      <Box
                        sx={{
                          mt: 2,
                          pt: 1.5,
                          borderTop: '1px dashed rgba(255, 255, 255, 0.12)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.5,
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 800 }}>
                          CUSTOMIZE METADATA FOR THIS TITLE:
                        </Typography>

                        <Grid container spacing={1.5} alignItems="center">
                          {/* Watch Status Selector */}
                          <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                              <InputLabel sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>Watch Status</InputLabel>
                              <Select
                                value={currentOpts.watchStatus}
                                label="Watch Status"
                                onChange={(e) => updateItemOption(item.id, 'watchStatus', e.target.value)}
                                sx={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                  color: '#F8FAFC',
                                  borderRadius: 1.5,
                                  fontSize: '0.82rem',
                                }}
                              >
                                <MenuItem value="unwatched">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VisibilityOffIcon sx={{ fontSize: 15, color: '#94A3B8' }} /> Unwatched
                                  </Box>
                                </MenuItem>
                                <MenuItem value="watching">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AutoAwesomeIcon sx={{ fontSize: 15, color: '#38BDF8' }} /> Watching
                                  </Box>
                                </MenuItem>
                                <MenuItem value="watched">
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <VisibilityIcon sx={{ fontSize: 15, color: '#10B981' }} /> Watched
                                  </Box>
                                </MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>

                          {/* Genre Selector */}
                          <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                              <InputLabel sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>Genre</InputLabel>
                              <Select
                                value={currentOpts.genre}
                                label="Genre"
                                onChange={(e) => updateItemOption(item.id, 'genre', e.target.value)}
                                sx={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                                  color: '#F8FAFC',
                                  borderRadius: 1.5,
                                  fontSize: '0.82rem',
                                }}
                              >
                                <MenuItem value="">
                                  <em>Auto TMDB Genre</em>
                                </MenuItem>
                                {allGenresList.map((g) => (
                                  <MenuItem key={g.id} value={g.name}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box
                                        sx={{
                                          width: 8,
                                          height: 8,
                                          borderRadius: '50%',
                                          backgroundColor: g.color,
                                        }}
                                      />
                                      {g.name}
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          {/* Watchlist Selector */}
                          <Grid item xs={12} sm={4}>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, mb: 0.5, display: 'block' }}>
                                Watchlist
                              </Typography>
                              <WatchlistTreeSelect
                                value={currentOpts.watchlistId || 'none'}
                                onChange={(newId) => {
                                  const actualId = newId === 'none' || newId === '__new__' ? '' : newId;
                                  updateItemOption(item.id, 'watchlistId', actualId);
                                }}
                                watchlists={selectableWatchlists}
                                noneLabel="None (Unassigned)"
                                allowCreateNew={false}
                                minWidth="100%"
                              />
                            </Box>
                          </Grid>

                          {/* Personal Rating */}
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
                                Rating:
                              </Typography>
                              <Rating
                                value={currentOpts.rating}
                                precision={0.5}
                                onChange={(_, newVal) => updateItemOption(item.id, 'rating', newVal)}
                                emptyIcon={<StarIcon style={{ opacity: 0.25, color: '#fff' }} fontSize="inherit" />}
                                sx={{ color: '#E5A93C' }}
                              />
                              {currentOpts.rating !== null && (
                                <Button
                                  size="small"
                                  onClick={() => updateItemOption(item.id, 'rating', null)}
                                  sx={{ color: '#64748B', fontSize: '0.7rem', minWidth: 'auto', p: 0.2 }}
                                >
                                  Clear
                                </Button>
                              )}
                            </Box>
                          </Grid>

                          {/* Favorite toggle */}
                          <Grid item xs={12} sm={6}>
                            <Button
                              size="small"
                              variant={currentOpts.isFavorite ? 'contained' : 'outlined'}
                              color="secondary"
                              startIcon={currentOpts.isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                              onClick={() => updateItemOption(item.id, 'isFavorite', !currentOpts.isFavorite)}
                              sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                borderRadius: 1.5,
                              }}
                            >
                              {currentOpts.isFavorite ? 'Favorite' : 'Mark as Favorite'}
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>
                    </Collapse>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        )}

        {results.length === 0 && !loading && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Search for any movie or web series to enrich metadata and add it to your personal sanctuary.
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
