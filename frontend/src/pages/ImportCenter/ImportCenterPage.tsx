import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Checkbox,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  Alert,
  FormControl,
  InputLabel,
  Tooltip,
  IconButton,
  Rating,
  Slider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import LinkIcon from '@mui/icons-material/Link';
import MovieIcon from '@mui/icons-material/Movie';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import StarIcon from '@mui/icons-material/Star';
import TuneIcon from '@mui/icons-material/Tune';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { OttBadge } from '../../utils/ottProviders.js';

interface MatchItem {
  inputTitle: string;
  searchTitle?: string;
  parsedRating?: number | null;
  parsedStatus?: 'unwatched' | 'watching' | 'watched';
  parsedFavorite?: boolean;
  parsedWatchlistName?: string;
  parsedGenreName?: string;
  parsedProviderName?: string;
  parsedDirectUrl?: string;
  status: 'matched' | 'ambiguous' | 'not_found';
  confidence: number;
  selectedMovie: any | null;
  candidates: any[];

  // Per-movie import overrides
  watchStatus: 'unwatched' | 'watching' | 'watched';
  personalRating: number | null;
  isFavorite: boolean;
  watchlistId: string;
  genreId: string;
  providerName: string;
  directUrl: string;
}

export const ImportCenterPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Movie & OTT Merged Import State
  const [inputText, setInputText] = useState(
    'Interstellar | 4.5 | watched | fav | Sci-Fi | Prime Video | https://www.primevideo.com/detail/0STV48F47G\nVikram | 4.0 | watched | Disney+ Hotstar | https://www.hotstar.com/in/movies/vikram/1260105307\nThe Greatest of All Time | Netflix | https://www.netflix.com/title/81234567\nArrival | 5.0 | fav | Drama\nOppenheimer'
  );
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Global Defaults for Import
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>('none');
  const [newWatchlistName, setNewWatchlistName] = useState<string>('');
  const [globalWatchStatus, setGlobalWatchStatus] = useState<'unwatched' | 'watching' | 'watched'>('unwatched');
  const [globalPersonalRating, setGlobalPersonalRating] = useState<number | null>(null);
  const [globalIsFavorite, setGlobalIsFavorite] = useState<boolean>(false);
  const [globalGenreId, setGlobalGenreId] = useState<string>('none');

  // Global Default OTT Streaming Link Options
  const [globalProviderName, setGlobalProviderName] = useState<string>('');
  const [globalDirectUrl, setGlobalDirectUrl] = useState<string>('');

  const [committing, setCommitting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Genre selection state
  const [selectedGenreIds, setSelectedGenreIds] = useState<Set<string>>(new Set());
  const [newGenreNameInput, setNewGenreNameInput] = useState('');
  const [creatingGenre, setCreatingGenre] = useState(false);

  // Fetch user's existing watchlists
  const { data: watchlistsData } = useQuery({
    queryKey: ['watchlists'],
    queryFn: async () => {
      const res = await api.get('/watchlists');
      return res.data?.data;
    },
  });

  const watchlists: any[] = Array.isArray(watchlistsData)
    ? watchlistsData
    : (watchlistsData?.watchlists || []);

  // Fetch genres (predefined + custom)
  const { data: genresData, refetch: refetchGenres } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return res.data?.data;
    },
  });

  const predefinedGenres: any[] = genresData?.predefined || [];
  const customGenres: any[] = genresData?.custom || [];

  const handleFindMovies = async () => {
    const titles = inputText.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    if (titles.length === 0) return;

    setLoading(true);
    setImportResult(null);
    try {
      const res = await api.post('/import/match', { titles });
      const rawItems: any[] = res.data?.data || [];

      const items: MatchItem[] = rawItems.map((m: any) => ({
        ...m,
        candidates: Array.isArray(m.candidates) ? m.candidates : [],
        watchStatus: m.parsedStatus || globalWatchStatus,
        personalRating: m.parsedRating !== undefined && m.parsedRating !== null ? m.parsedRating : globalPersonalRating,
        isFavorite: m.parsedFavorite !== undefined ? m.parsedFavorite : globalIsFavorite,
        watchlistId: selectedWatchlistId,
        genreId: m.parsedGenreName || globalGenreId,
        providerName: m.parsedProviderName || globalProviderName || '',
        directUrl: m.parsedDirectUrl || globalDirectUrl || '',
      }));

      setMatches(items);

      // Auto select matched and confident items
      const preSelected = new Set<number>();
      items.forEach((item, idx) => {
        if (item.status === 'matched' && item.selectedMovie) {
          preSelected.add(idx);
        }
      });
      setSelectedIndices(preSelected);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRowItem = (index: number, updates: Partial<MatchItem>) => {
    setMatches((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], ...updates };
      }
      return next;
    });
  };

  const handleApplyGlobalDefaultsToAll = () => {
    setMatches((prev) =>
      prev.map((item) => ({
        ...item,
        watchStatus: globalWatchStatus,
        personalRating: globalPersonalRating,
        isFavorite: globalIsFavorite,
        watchlistId: selectedWatchlistId,
        genreId: globalGenreId,
        providerName: globalProviderName || item.providerName,
        directUrl: globalDirectUrl || item.directUrl,
      }))
    );
  };

  const handleToggleRow = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIndices.size === matches.length) {
      setSelectedIndices(new Set());
    } else {
      const allValid = new Set<number>();
      matches.forEach((m, idx) => {
        if (m.selectedMovie) allValid.add(idx);
      });
      setSelectedIndices(allValid);
    }
  };

  const handleDisambiguate = (index: number, tmdbId: number) => {
    const item = matches[index];
    const cand = item.candidates.find((c) => c.id === tmdbId);
    if (!cand) return;

    const newMatches = [...matches];
    newMatches[index] = {
      ...item,
      selectedMovie: cand,
      status: 'matched',
    };
    setMatches(newMatches);

    // Ensure row is selected
    setSelectedIndices((prev) => new Set(prev).add(index));
  };

  const handleCreateGenre = async () => {
    const name = newGenreNameInput.trim();
    if (!name) return;
    setCreatingGenre(true);
    try {
      const res = await api.post('/genres', { name });
      const created = res.data?.data;
      await refetchGenres();
      if (created?.id) {
        setSelectedGenreIds((prev) => new Set(prev).add(created.id));
        setGlobalGenreId(created.name || created.id);
      }
      setNewGenreNameInput('');
    } catch (e: any) {
      alert(e.message || 'Failed to create genre');
    } finally {
      setCreatingGenre(false);
    }
  };

  const handleCommitImport = async () => {
    const payloadItems = Array.from(selectedIndices)
      .map((idx) => {
        const item = matches[idx];
        if (!item?.selectedMovie) return null;
        return {
          tmdbId: item.selectedMovie.id,
          watchStatus: item.watchStatus,
          personalRating: item.personalRating,
          isFavorite: item.isFavorite,
          watchlistId: item.watchlistId !== 'none' ? item.watchlistId : undefined,
          genreId: item.genreId !== 'none' ? item.genreId : undefined,
          providerName: item.providerName || undefined,
          directUrl: item.directUrl || undefined,
        };
      })
      .filter(Boolean);

    if (payloadItems.length === 0) return;

    setCommitting(true);
    try {
      let watchlistIdToUse: string | null = null;
      if (selectedWatchlistId === '__new__') {
        const name = newWatchlistName.trim();
        if (name) {
          const wlRes = await api.post('/watchlists', { name });
          watchlistIdToUse = wlRes.data?.data?.id || null;
        }
      } else if (selectedWatchlistId !== 'none') {
        watchlistIdToUse = selectedWatchlistId;
      }

      const res = await api.post('/import/commit', {
        movies: payloadItems,
        watchlistId: watchlistIdToUse,
        newWatchlistName: selectedWatchlistId === '__new__' ? newWatchlistName.trim() : undefined,
        customGenreIds: Array.from(selectedGenreIds),
        genreId: globalGenreId !== 'none' ? globalGenreId : undefined,
        watchStatus: globalWatchStatus,
        personalRating: globalPersonalRating,
        isFavorite: globalIsFavorite,
        providerName: globalProviderName || undefined,
        directUrl: globalDirectUrl || undefined,
      });

      setImportResult(res.data?.data);
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch {
      // Handled
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 0.5 }}>
          Import & Resource Center
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
          Unified bulk import for movies, watchlists, rating slider (1 - 5), watched status, favorites, genres, and direct OTT streaming links.
        </Typography>
      </Box>

      {/* STEP 1: INPUT PANEL */}
      <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Typography variant="subtitle2" sx={{ color: '#E5A93C', fontWeight: 700, mb: 0.5 }}>
          STEP 1: PASTE TITLES & OTT LINKS (ONE PER LINE)
        </Typography>
        <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1.5 }}>
          Supported formats:
          <br />
          • <code>Movie Title</code>
          <br />
          • <code>Movie Title | Rating (1-5 e.g. 4.5) | Status (watched/unwatched) | Favorite (fav) | Genre | OTT Provider | Direct OTT URL</code>
          <br />
          • <code>Movie Title | Provider Name | Direct OTT URL</code>
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={5}
          placeholder={`Interstellar | 4.5 | watched | fav | Sci-Fi | Prime Video | https://www.primevideo.com/detail/0STV48F47G\nVikram | 4.0 | watched | Disney+ Hotstar | https://www.hotstar.com/in/movies/vikram/1260105307\nThe Greatest of All Time | Netflix | https://www.netflix.com/title/81234567\nArrival | 5.0 | fav | Drama`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          sx={{ mb: 2.5 }}
        />

        {/* Global Import Settings Fieldset */}
        <Paper sx={{ p: 2, mb: 2.5, backgroundColor: '#111827', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <TuneIcon sx={{ color: '#38BDF8', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
              Batch Default Controls (Watchlist, Genre, Status, 1-5 Rating Slider, Favorite & OTT Link)
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {/* Watchlist Select */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="global-watchlist-label" sx={{ color: '#94A3B8' }}>Select Watchlist</InputLabel>
              <Select
                labelId="global-watchlist-label"
                value={selectedWatchlistId}
                label="Select Watchlist"
                onChange={(e) => setSelectedWatchlistId(e.target.value)}
                sx={{ color: '#F8FAFC', backgroundColor: '#0B0F19' }}
              >
                <MenuItem value="none"><em>None (Library only)</em></MenuItem>
                <MenuItem value="__new__" sx={{ color: '#38BDF8', fontWeight: 600 }}>+ Create New Watchlist...</MenuItem>
                {watchlists.map((wl) => (
                  <MenuItem key={wl.id} value={wl.id}>{wl.name} ({wl.movie_count ?? 0} movies)</MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedWatchlistId === '__new__' && (
              <TextField
                size="small"
                placeholder="Enter new watchlist name..."
                value={newWatchlistName}
                onChange={(e) => setNewWatchlistName(e.target.value)}
                sx={{ minWidth: 160, backgroundColor: '#0B0F19', input: { color: '#F8FAFC' } }}
              />
            )}

            {/* Genre Select */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="global-genre-label" sx={{ color: '#94A3B8' }}>Select Genre</InputLabel>
              <Select
                labelId="global-genre-label"
                value={globalGenreId}
                label="Select Genre"
                onChange={(e) => setGlobalGenreId(e.target.value)}
                sx={{ color: '#F8FAFC', backgroundColor: '#0B0F19' }}
              >
                <MenuItem value="none"><em>None (TMDB Default)</em></MenuItem>
                {predefinedGenres.map((g) => (
                  <MenuItem key={g.id || g.name} value={g.name}>{g.name}</MenuItem>
                ))}
                {customGenres.map((g) => (
                  <MenuItem key={g.id} value={g.id}>{g.name} (Custom)</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Watch Status Select */}
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel id="global-status-label" sx={{ color: '#94A3B8' }}>Watch Status</InputLabel>
              <Select
                labelId="global-status-label"
                value={globalWatchStatus}
                label="Watch Status"
                onChange={(e) => setGlobalWatchStatus(e.target.value as any)}
                sx={{ color: '#F8FAFC', backgroundColor: '#0B0F19' }}
              >
                <MenuItem value="unwatched">Unwatched</MenuItem>
                <MenuItem value="watching">Watching</MenuItem>
                <MenuItem value="watched">Watched</MenuItem>
              </Select>
            </FormControl>

            {/* My Rating Slider (1 to 5 scale in 0.5 steps e.g. 1.5, 2.5, 3.5) */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.2,
                px: 2,
                minWidth: 250,
                backgroundColor: '#0B0F19',
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: 1.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                  MY RATING SLIDER (1 - 5)
                </Typography>
                <Chip
                  size="small"
                  icon={<StarIcon sx={{ color: '#E5A93C !important', fontSize: '14px !important' }} />}
                  label={globalPersonalRating ? `${globalPersonalRating.toFixed(1)} / 5.0` : 'Not Rated'}
                  sx={{
                    height: 22,
                    backgroundColor: globalPersonalRating ? 'rgba(229, 169, 60, 0.15)' : 'rgba(255,255,255,0.05)',
                    color: globalPersonalRating ? '#E5A93C' : '#64748B',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Slider
                  value={globalPersonalRating ?? 0}
                  min={0}
                  max={5}
                  step={0.5}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(val) => (val === 0 ? 'Off' : `${val} ★`)}
                  onChange={(_, val) => setGlobalPersonalRating(val === 0 ? null : (val as number))}
                  sx={{
                    flexGrow: 1,
                    color: '#E5A93C',
                    height: 5,
                    '& .MuiSlider-thumb': {
                      width: 16,
                      height: 16,
                      '&:hover, &.Mui-focusVisible': {
                        boxShadow: '0 0 0 8px rgba(229, 169, 60, 0.16)',
                      },
                    },
                    '& .MuiSlider-track': { border: 'none' },
                    '& .MuiSlider-rail': { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
                  }}
                />
                <Rating
                  value={globalPersonalRating ?? 0}
                  readOnly
                  precision={0.5}
                  max={5}
                  size="small"
                  emptyIcon={<StarIcon sx={{ color: 'rgba(255,255,255,0.15)', fontSize: 18 }} />}
                  icon={<StarIcon sx={{ color: '#E5A93C', fontSize: 18 }} />}
                />
              </Box>
            </Paper>

            {/* Is Favorite Button Toggle */}
            <Button
              variant={globalIsFavorite ? "contained" : "outlined"}
              color={globalIsFavorite ? "error" : "inherit"}
              size="small"
              onClick={() => setGlobalIsFavorite(!globalIsFavorite)}
              startIcon={globalIsFavorite ? <FavoriteIcon sx={{ color: '#FFF' }} /> : <FavoriteBorderIcon sx={{ color: '#EF4444' }} />}
              sx={{
                fontWeight: 700,
                textTransform: 'none',
                height: 48,
                borderColor: globalIsFavorite ? '#EF4444' : 'rgba(239, 68, 68, 0.5)',
                color: globalIsFavorite ? '#FFF' : '#EF4444',
                backgroundColor: globalIsFavorite ? '#EF4444' : 'transparent',
                '&:hover': {
                  backgroundColor: globalIsFavorite ? '#DC2626' : 'rgba(239,68,68,0.1)',
                },
              }}
            >
              {globalIsFavorite ? 'Favorite Marked' : 'Mark Favorite'}
            </Button>
          </Box>
        </Paper>

        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
          onClick={handleFindMovies}
          disabled={loading || !inputText.trim()}
          sx={{ fontWeight: 700, px: 3 }}
        >
          {loading ? 'Matching Titles & OTT Links...' : 'Find & Preview Matches on TMDB'}
        </Button>
      </Paper>

      {importResult && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon fontSize="inherit" />}
          sx={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          Successfully imported {importResult.addedCount || importResult.importedCount || 0} movies to library! {importResult.watchlistName ? `(Added ${importResult.watchlistAddedCount || 0} to watchlist "${importResult.watchlistName}")` : ''} {importResult.ottAddedCount ? `(Updated ${importResult.ottAddedCount} direct OTT links)` : ''}
        </Alert>
      )}

      {/* STEP 2: REVIEW & APPROVE MATCHES */}
      {matches.length > 0 && (
        <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {/* Genre Selector */}
          <Paper sx={{ p: 2, mb: 2.5, backgroundColor: '#111827', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CategoryIcon sx={{ color: '#38BDF8', fontSize: 18 }} />
              <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                Assign Additional Genre to Imported Movies (Optional)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.5 }}>
              {predefinedGenres.map((g: any) => {
                const isSelected = selectedGenreIds.has(g.id);
                return (
                  <Chip
                    key={g.id}
                    label={g.name}
                    size="small"
                    clickable
                    onClick={() => {
                      setSelectedGenreIds(prev => {
                        const next = new Set(prev);
                        if (next.has(g.id)) next.delete(g.id);
                        else next.add(g.id);
                        return next;
                      });
                    }}
                    sx={{
                      backgroundColor: isSelected ? 'rgba(56,189,248,0.25)' : 'transparent',
                      color: isSelected ? '#38BDF8' : '#94A3B8',
                      borderColor: isSelected ? '#38BDF8' : 'rgba(255,255,255,0.15)',
                      fontWeight: 600,
                    }}
                    variant="outlined"
                  />
                );
              })}
              {customGenres.map((g: any) => {
                const isSelected = selectedGenreIds.has(g.id);
                return (
                  <Chip
                    key={g.id}
                    label={g.name}
                    size="small"
                    clickable
                    onClick={() => {
                      setSelectedGenreIds(prev => {
                        const next = new Set(prev);
                        if (next.has(g.id)) next.delete(g.id);
                        else next.add(g.id);
                        return next;
                      });
                    }}
                    sx={{
                      backgroundColor: isSelected ? `${g.color || '#A855F7'}33` : 'transparent',
                      color: isSelected ? (g.color || '#A855F7') : '#94A3B8',
                      borderColor: isSelected ? (g.color || '#A855F7') : 'rgba(255,255,255,0.15)',
                      fontWeight: 600,
                    }}
                    variant="outlined"
                  />
                );
              })}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, maxWidth: 360 }}>
              <TextField
                size="small"
                placeholder="Create custom genre..."
                value={newGenreNameInput}
                onChange={(e) => setNewGenreNameInput(e.target.value)}
                sx={{ flexGrow: 1, backgroundColor: '#0B0F19', input: { color: '#F8FAFC', fontSize: '0.8rem' } }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={creatingGenre ? <CircularProgress size={13} /> : <AddIcon />}
                disabled={!newGenreNameInput.trim() || creatingGenre}
                onClick={handleCreateGenre}
                sx={{ color: '#38BDF8', borderColor: 'rgba(56,189,248,0.4)', fontWeight: 700 }}
              >
                Add
              </Button>
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#38BDF8', fontWeight: 700 }}>
                STEP 2: REVIEW & APPROVE MATCHES ({selectedIndices.size} of {matches.length} selected)
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Review or update individual watchlist, genre, status, rating (1-5 slider), favorite, and direct OTT link per movie.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleApplyGlobalDefaultsToAll}
                sx={{ color: '#38BDF8', borderColor: 'rgba(56,189,248,0.4)', fontWeight: 600, textTransform: 'none' }}
              >
                Apply Batch Defaults to All
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddCircleIcon />}
                onClick={handleCommitImport}
                disabled={selectedIndices.size === 0 || committing}
                sx={{ fontWeight: 700, px: 3 }}
              >
                {committing ? 'Importing...' : `Import & Apply ${selectedIndices.size} Movies to Library`}
              </Button>
            </Box>
          </Box>

          <Table sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={matches.length > 0 && selectedIndices.size === matches.length}
                    indeterminate={selectedIndices.size > 0 && selectedIndices.size < matches.length}
                    onChange={handleSelectAll}
                    sx={{ color: '#38BDF8', '&.Mui-checked': { color: '#38BDF8' } }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Your Input</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>TMDB Match & Poster</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Watchlist</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Genre</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Watch Status</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>My Rating (1-5)</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Fav</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Direct OTT Link</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Status / Disambiguate</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Confidence</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.map((item, idx) => {
                const isSelected = selectedIndices.has(idx);
                const m = item.selectedMovie;
                return (
                  <TableRow key={idx} sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        disabled={!m}
                        onChange={() => handleToggleRow(idx)}
                        sx={{ color: '#38BDF8', '&.Mui-checked': { color: '#38BDF8' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                      {item.inputTitle}
                      {item.parsedWatchlistName && (
                        <Typography variant="caption" sx={{ display: 'block', color: '#E5A93C' }}>
                          Watchlist: {item.parsedWatchlistName}
                        </Typography>
                      )}
                      {item.parsedGenreName && (
                        <Typography variant="caption" sx={{ display: 'block', color: '#38BDF8' }}>
                          Genre: {item.parsedGenreName}
                        </Typography>
                      )}
                      {item.providerName && (
                        <Box sx={{ mt: 0.5 }}>
                          <OttBadge providerName={item.providerName} size="small" />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      {m ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            component="img"
                            src={m.poster_path ? `https://image.tmdb.org/t/p/w200${m.poster_path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=200&q=80'}
                            alt={m.title}
                            sx={{ width: 36, height: 50, borderRadius: 1, objectFit: 'cover' }}
                          />
                          <Box>
                            <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{m.title}</Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>{m.release_date ? m.release_date.substring(0, 4) : 'Unknown Year'}</Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#EF4444' }}>No confident match found</Typography>
                      )}
                    </TableCell>

                    {/* Watchlist selection per item */}
                    <TableCell>
                      <Select
                        size="small"
                        value={item.watchlistId}
                        onChange={(e) => handleUpdateRowItem(idx, { watchlistId: e.target.value })}
                        sx={{ color: '#F8FAFC', fontSize: '0.8rem', minWidth: 120 }}
                      >
                        <MenuItem value="none"><em>None</em></MenuItem>
                        {watchlists.map((wl) => (
                          <MenuItem key={wl.id} value={wl.id}>{wl.name}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    {/* Genre selection per item */}
                    <TableCell>
                      <Select
                        size="small"
                        value={item.genreId}
                        onChange={(e) => handleUpdateRowItem(idx, { genreId: e.target.value })}
                        sx={{ color: '#F8FAFC', fontSize: '0.8rem', minWidth: 120 }}
                      >
                        <MenuItem value="none"><em>TMDB Default</em></MenuItem>
                        {predefinedGenres.map((g) => (
                          <MenuItem key={g.id || g.name} value={g.name}>{g.name}</MenuItem>
                        ))}
                        {customGenres.map((g) => (
                          <MenuItem key={g.id} value={g.id}>{g.name} (Custom)</MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    {/* Watch Status selection per item */}
                    <TableCell>
                      <Select
                        size="small"
                        value={item.watchStatus}
                        onChange={(e) => handleUpdateRowItem(idx, { watchStatus: e.target.value as any })}
                        sx={{ color: '#F8FAFC', fontSize: '0.8rem', minWidth: 110 }}
                      >
                        <MenuItem value="unwatched">Unwatched</MenuItem>
                        <MenuItem value="watching">Watching</MenuItem>
                        <MenuItem value="watched">Watched</MenuItem>
                      </Select>
                    </TableCell>

                    {/* My Rating slider / stars per item */}
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, minWidth: 145 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Rating
                            value={item.personalRating ?? 0}
                            readOnly
                            precision={0.5}
                            max={5}
                            size="small"
                            emptyIcon={<StarIcon sx={{ color: 'rgba(255,255,255,0.15)', fontSize: 18 }} />}
                            icon={<StarIcon sx={{ color: '#E5A93C', fontSize: 18 }} />}
                          />
                          <Typography variant="caption" sx={{ color: item.personalRating ? '#E5A93C' : '#64748B', fontWeight: 700, minWidth: 24 }}>
                            {item.personalRating != null ? `${item.personalRating.toFixed(1)}` : 'Off'}
                          </Typography>
                        </Box>
                        <Slider
                          value={item.personalRating ?? 0}
                          min={0}
                          max={5}
                          step={0.5}
                          onChange={(_, val) => handleUpdateRowItem(idx, { personalRating: val === 0 ? null : (val as number) })}
                          sx={{
                            color: '#E5A93C',
                            height: 3,
                            p: '4px 0',
                            '& .MuiSlider-thumb': {
                              width: 10,
                              height: 10,
                            },
                            '& .MuiSlider-rail': { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
                          }}
                        />
                      </Box>
                    </TableCell>

                    {/* Favorite toggle per item */}
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateRowItem(idx, { isFavorite: !item.isFavorite })}
                        sx={{ color: item.isFavorite ? '#EF4444' : '#64748B' }}
                      >
                        {item.isFavorite ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>

                    {/* Direct OTT Link Input & Preview per item */}
                    <TableCell sx={{ minWidth: 200 }}>
                      <TextField
                        size="small"
                        placeholder="https://..."
                        value={item.directUrl}
                        onChange={(e) => handleUpdateRowItem(idx, { directUrl: e.target.value })}
                        sx={{
                          backgroundColor: '#0B0F19',
                          input: { color: '#38BDF8', fontSize: '0.78rem' },
                        }}
                      />
                      {item.directUrl && (
                        <Tooltip title={item.directUrl}>
                          <Box
                            component="a"
                            href={item.directUrl}
                            target="_blank"
                            rel="noreferrer"
                            sx={{
                              color: '#38BDF8',
                              fontSize: '0.75rem',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              mt: 0.5,
                              '&:hover': { textDecoration: 'underline' },
                            }}
                          >
                            Test Link <OpenInNewIcon sx={{ fontSize: 11 }} />
                          </Box>
                        </Tooltip>
                      )}
                    </TableCell>

                    <TableCell>
                      {item.status === 'ambiguous' && item.candidates.length > 1 ? (
                        <Select
                          size="small"
                          value={m?.id || ''}
                          onChange={(e) => handleDisambiguate(idx, Number(e.target.value))}
                          sx={{ color: '#F8FAFC', fontSize: '0.8rem', minWidth: 140 }}
                        >
                          {item.candidates.map((cand) => (
                            <MenuItem key={cand.id} value={cand.id}>{cand.title} ({cand.release_date?.substring(0, 4) || '?'})</MenuItem>
                          ))}
                        </Select>
                      ) : item.status === 'matched' ? (
                        <Chip label="Matched" size="small" sx={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 600 }} />
                      ) : (
                        <Chip label="Not Found" size="small" sx={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444' }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: item.confidence >= 80 ? '#10B981' : '#F59E0B', fontWeight: 700 }}>
                      {item.confidence}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};
