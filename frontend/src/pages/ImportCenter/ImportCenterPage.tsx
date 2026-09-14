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
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';

interface MatchItem {
  inputTitle: string;
  status: 'matched' | 'ambiguous' | 'not_found';
  confidence: number;
  selectedMovie: any | null;
  candidates: any[];
}

export const ImportCenterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState(
    'Interstellar\nInception\nDune\nArrival\nOppenheimer\nVikram'
  );
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string>('none');
  const [newWatchlistName, setNewWatchlistName] = useState<string>('');
  const [committing, setCommitting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Genre selection state
  const [selectedGenreIds, setSelectedGenreIds] = useState<Set<string>>(new Set());
  const [newGenreNameInput, setNewGenreNameInput] = useState('');
  const [creatingGenre, setCreatingGenre] = useState(false);

  // Fetch user's existing watchlists
  const { data: watchlists = [] } = useQuery<any[]>({
    queryKey: ['watchlists'],
    queryFn: async () => {
      const res = await api.get('/watchlists');
      return res.data?.data || [];
    },
  });

  // Fetch genres (predefined + custom)
  const { data: genresData, refetch: refetchGenres } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return res.data?.data;
    },
  });

  const handleFindMovies = async () => {
    const titles = inputText.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    if (titles.length === 0) return;

    setLoading(true);
    setImportResult(null);
    try {
      const res = await api.post('/import/match', { titles });
      const items: MatchItem[] = res.data?.data || [];
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

  const handleDisambiguate = (idx: number, candidateId: number) => {
    setMatches((prev) => {
      const next = [...prev];
      const found = next[idx].candidates.find(c => c.id === candidateId);
      if (found) {
        next[idx] = {
          ...next[idx],
          selectedMovie: found,
          status: 'matched',
          confidence: 100,
        };
      }
      return next;
    });
    setSelectedIndices(prev => new Set(prev).add(idx));
  };

  const handleToggleGenre = (id: string) => {
    setSelectedGenreIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateGenre = async () => {
    if (!newGenreNameInput.trim()) return;
    setCreatingGenre(true);
    try {
      const res = await api.post('/genres', { name: newGenreNameInput.trim() });
      const created = res.data?.data;
      if (created?.id) {
        setSelectedGenreIds(prev => new Set(prev).add(created.id));
      }
      setNewGenreNameInput('');
      refetchGenres();
    } catch {
      // ignore
    } finally {
      setCreatingGenre(false);
    }
  };

  const handleCommitImport = async () => {
    const approvedTmdbIds = Array.from(selectedIndices)
      .map(idx => matches[idx]?.selectedMovie?.id)
      .filter(Boolean);

    if (approvedTmdbIds.length === 0) return;

    const payload: any = {
      selectedTmdbIds: approvedTmdbIds,
      customGenreIds: Array.from(selectedGenreIds),
    };
    if (selectedWatchlistId === '__new__' && newWatchlistName.trim()) {
      payload.newWatchlistName = newWatchlistName.trim();
    } else if (selectedWatchlistId && selectedWatchlistId !== 'none') {
      payload.watchlistId = selectedWatchlistId;
    }

    setCommitting(true);
    try {
      const res = await api.post('/import/commit', payload);
      setImportResult(res.data?.data);
      // Invalidate queries so library and watchlists refresh automatically
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['taste-profile'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });

      // Clear matched once imported
      setMatches([]);
      setSelectedIndices(new Set());
      setSelectedGenreIds(new Set());
      setNewWatchlistName('');
    } finally {
      setCommitting(false);
    }
  };

  const predefinedGenres: any[] = genresData?.predefined || [];
  const customGenres: any[] = genresData?.custom || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 0.5 }}>
          Bulk Watchlist Import Center
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
          Paste lists of movie titles. Review and approve TMDB matches before importing into your personal sanctuary.
        </Typography>
      </Box>

      {/* Input Section */}
      <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Typography variant="subtitle2" sx={{ color: '#E5A93C', fontWeight: 700, mb: 1 }}>
          STEP 1: PASTE TITLES (ONE PER LINE)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={5}
          placeholder="Interstellar&#10;Inception&#10;Dune&#10;Arrival"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
          onClick={handleFindMovies}
          disabled={loading || !inputText.trim()}
          sx={{ fontWeight: 700, px: 3 }}
        >
          {loading ? 'Matching Titles...' : 'Find & Match Movies on TMDB'}
        </Button>
      </Paper>

      {/* Import Result Notification */}
      {importResult && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlineIcon fontSize="inherit" />}
          sx={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 2,
          }}
        >
          Successfully imported {importResult.addedCount} movies into your library!
          {importResult.watchlistName && (
            <span>
              {' '}Also added <strong>{importResult.watchlistAddedCount ?? importResult.addedCount}</strong> films to watchlist <strong>"{importResult.watchlistName}"</strong>.
            </span>
          )}
          {importResult.skippedCount > 0 && ` (${importResult.skippedCount} movies were already in your library)`}
        </Alert>
      )}

      {/* Step 2 Panel (shown after matching) */}
      {matches.length > 0 && (
        <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>

          {/* ─── Genre Pre-Assignment Panel ─── */}
          <Paper
            sx={{
              p: 2.5,
              mb: 3,
              backgroundColor: '#0D1320',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(56, 189, 248, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CategoryIcon sx={{ color: '#38BDF8', fontSize: 20 }} />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                  Pre-Assign Custom Genres <span style={{ color: '#64748B', fontWeight: 400 }}>(Optional)</span>
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  All selected genres will be applied to every movie in this import batch
                </Typography>
              </Box>
              {selectedGenreIds.size > 0 && (
                <Chip
                  label={`${selectedGenreIds.size} genre${selectedGenreIds.size > 1 ? 's' : ''} selected`}
                  size="small"
                  sx={{ backgroundColor: 'rgba(56,189,248,0.15)', color: '#38BDF8', fontWeight: 700 }}
                />
              )}
            </Box>

            {/* Predefined genres — read-only reference */}
            {predefinedGenres.length > 0 && (
              <>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, letterSpacing: '0.06em', display: 'block', mb: 0.8 }}>
                  STANDARD GENRES (read-only — assigned automatically via TMDB)
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7, mb: 2, maxHeight: 80, overflowY: 'auto' }}>
                  {predefinedGenres.map((pg: any) => (
                    <Chip
                      key={pg.id}
                      label={pg.name}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 24,
                        fontSize: '0.72rem',
                        color: pg.color || '#94A3B8',
                        borderColor: `${pg.color || '#64748B'}50`,
                        opacity: 0.6,
                        cursor: 'default',
                        fontWeight: 500,
                      }}
                    />
                  ))}
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 2 }} />
              </>
            )}

            {/* Custom genres — selectable */}
            <Typography variant="caption" sx={{ color: '#38BDF8', fontWeight: 700, letterSpacing: '0.06em', display: 'block', mb: 1 }}>
              YOUR CUSTOM GENRES — click to select
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1.5, minHeight: 34 }}>
              {customGenres.map((cg: any) => {
                const isSelected = selectedGenreIds.has(cg.id);
                return (
                  <Chip
                    key={cg.id}
                    label={cg.name}
                    clickable
                    onClick={() => handleToggleGenre(cg.id)}
                    variant={isSelected ? 'filled' : 'outlined'}
                    sx={{
                      backgroundColor: isSelected ? `${cg.color || '#38BDF8'}30` : 'transparent',
                      color: isSelected ? '#FFF' : (cg.color || '#38BDF8'),
                      borderColor: cg.color || '#38BDF8',
                      fontWeight: 700,
                      transition: 'all 0.15s ease',
                      '&:hover': {
                        backgroundColor: `${cg.color || '#38BDF8'}20`,
                        transform: 'scale(1.03)',
                      },
                    }}
                  />
                );
              })}
              {customGenres.length === 0 && (
                <Typography variant="caption" sx={{ color: '#475569', alignSelf: 'center' }}>
                  No custom genres yet — create one below to start tagging your imports.
                </Typography>
              )}
            </Box>

            {/* Inline genre creator */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="Create & auto-select new genre (e.g. Heist, Gangster, Dark Comedy)..."
                value={newGenreNameInput}
                onChange={(e) => setNewGenreNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGenreNameInput.trim()) handleCreateGenre();
                }}
                sx={{
                  flexGrow: 1,
                  input: { color: '#F8FAFC', fontSize: '0.85rem' },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: 'rgba(56,189,248,0.2)' },
                    '&:hover fieldset': { borderColor: '#38BDF8' },
                    '&.Mui-focused fieldset': { borderColor: '#38BDF8' },
                  },
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={creatingGenre ? <CircularProgress size={13} /> : <AddIcon />}
                disabled={!newGenreNameInput.trim() || creatingGenre}
                onClick={handleCreateGenre}
                sx={{
                  color: '#38BDF8',
                  borderColor: 'rgba(56,189,248,0.4)',
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  '&:hover': { borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,0.08)' },
                }}
              >
                {creatingGenre ? 'Creating...' : 'Add & Select'}
              </Button>
            </Box>
          </Paper>

          {/* Watchlist Destination Toolbar */}
          <Paper
            sx={{
              p: 2,
              mb: 3,
              backgroundColor: '#111827',
              border: '1px solid rgba(229, 169, 60, 0.25)',
              borderRadius: 2,
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(229, 169, 60, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <PlaylistAddIcon sx={{ color: '#E5A93C' }} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                  Add to Watchlist (Optional)
                </Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  Optionally assign all selected imported films to one of your custom watchlists
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="import-watchlist-label" sx={{ color: '#94A3B8' }}>Destination Watchlist</InputLabel>
                <Select
                  labelId="import-watchlist-label"
                  value={selectedWatchlistId}
                  label="Destination Watchlist"
                  onChange={(e) => setSelectedWatchlistId(e.target.value)}
                  sx={{
                    color: '#F8FAFC',
                    backgroundColor: '#0B0F19',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E5A93C' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E5A93C' },
                  }}
                >
                  <MenuItem value="none">
                    <em>None (Import into library only)</em>
                  </MenuItem>
                  <MenuItem value="__new__" sx={{ color: '#38BDF8', fontWeight: 600 }}>
                    + Create New Watchlist...
                  </MenuItem>
                  {watchlists.map((wl) => (
                    <MenuItem key={wl.id} value={wl.id}>
                      {wl.name} ({wl.movie_count ?? 0} movies)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedWatchlistId === '__new__' && (
                <TextField
                  size="small"
                  placeholder="Enter new watchlist name..."
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  autoFocus
                  sx={{
                    minWidth: 220,
                    backgroundColor: '#0B0F19',
                    input: { color: '#F8FAFC' },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#38BDF8' },
                      '&:hover fieldset': { borderColor: '#38BDF8' },
                    },
                  }}
                />
              )}
            </Box>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: '#38BDF8', fontWeight: 700 }}>
                STEP 2: REVIEW & APPROVE MATCHES
              </Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Bulk import will NEVER automatically add items without your explicit confirmation.
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddCircleIcon />}
              onClick={handleCommitImport}
              disabled={
                selectedIndices.size === 0 ||
                committing ||
                (selectedWatchlistId === '__new__' && !newWatchlistName.trim())
              }
              sx={{ fontWeight: 700, px: 3 }}
            >
              {committing
                ? 'Importing...'
                : selectedWatchlistId === '__new__' && newWatchlistName.trim()
                ? `Import & Add ${selectedIndices.size} to "${newWatchlistName.trim()}"`
                : selectedWatchlistId !== 'none' && watchlists.find(w => w.id === selectedWatchlistId)
                ? `Import & Add ${selectedIndices.size} to "${watchlists.find(w => w.id === selectedWatchlistId)?.name}"`
                : `Add ${selectedIndices.size} Selected Movies to Library`}
            </Button>
          </Box>

          <Table sx={{ minWidth: 650 }}>
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
                    </TableCell>
                    <TableCell>
                      {m ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            component="img"
                            src={
                              m.poster_path
                                ? `https://image.tmdb.org/t/p/w200${m.poster_path}`
                                : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=200&q=80'
                            }
                            alt={m.title}
                            sx={{ width: 36, height: 50, borderRadius: 1, objectFit: 'cover' }}
                          />
                          <Box>
                            <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                              {m.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>
                              {m.release_date ? m.release_date.substring(0, 4) : 'Unknown Year'}
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: '#EF4444' }}>
                          No confident match found
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.status === 'ambiguous' && item.candidates.length > 1 ? (
                        <Select
                          size="small"
                          value={m?.id || ''}
                          onChange={(e) => handleDisambiguate(idx, Number(e.target.value))}
                          sx={{ color: '#F8FAFC', fontSize: '0.8rem', minWidth: 180 }}
                        >
                          {item.candidates.map((cand) => (
                            <MenuItem key={cand.id} value={cand.id}>
                              {cand.title} ({cand.release_date?.substring(0, 4) || '?'})
                            </MenuItem>
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
