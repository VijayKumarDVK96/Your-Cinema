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
  Tabs,
  Tab,
  Tooltip,
  IconButton,
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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { OttBadge } from '../../utils/ottProviders.js';

interface MatchItem {
  inputTitle: string;
  status: 'matched' | 'ambiguous' | 'not_found';
  confidence: number;
  selectedMovie: any | null;
  candidates: any[];
}

export const ImportCenterPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'import' | 'ott'>('import');

  // Movie Import State
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

  // OTT Link Bulk Import State
  const [ottInputText, setOttInputText] = useState(
    `The Greatest of All Time | Netflix | https://www.netflix.com/title/81234567\nVikram | Disney+ Hotstar | https://www.hotstar.com/in/movies/vikram/1260105307\nInterstellar | Prime Video | https://www.primevideo.com/detail/0STV48F47G`
  );
  const [ottLoading, setOttLoading] = useState(false);
  const [ottPreviewItems, setOttPreviewItems] = useState<any[]>([]);
  const [selectedOttIndices, setSelectedOttIndices] = useState<Set<number>>(new Set());
  const [replaceExistingSources, setReplaceExistingSources] = useState(true);
  const [ottApplying, setOttApplying] = useState(false);
  const [ottResult, setOttResult] = useState<any | null>(null);

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
      }
      setNewGenreNameInput('');
    } catch (e: any) {
      alert(e.message || 'Failed to create genre');
    } finally {
      setCreatingGenre(false);
    }
  };

  const handleCommitImport = async () => {
    const toImport = Array.from(selectedIndices)
      .map((idx) => matches[idx]?.selectedMovie)
      .filter(Boolean);

    if (toImport.length === 0) return;

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
        movies: toImport,
        watchlistId: watchlistIdToUse,
        genreIds: Array.from(selectedGenreIds),
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

  // OTT Link Bulk Handlers
  const handlePreviewOttLinks = async () => {
    const lines = ottInputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const entries = lines.map(line => {
      const parts = line.split('|').map(p => p.trim());
      return {
        title: parts[0] || '',
        providerName: parts[1] || 'Streaming Service',
        directUrl: parts[2] || '',
      };
    }).filter(e => e.title.length > 0 && e.directUrl.length > 0);

    if (entries.length === 0) {
      alert('Please enter at least one line in the format: Movie Title | Provider | Direct URL');
      return;
    }

    setOttLoading(true);
    setOttResult(null);
    try {
      const res = await api.post('/sources/bulk-ott-preview', { entries });
      const data = res.data?.data || [];
      setOttPreviewItems(data);

      const validSelected = new Set<number>();
      data.forEach((item: any, idx: number) => {
        if (item.selectedMovie) validSelected.add(idx);
      });
      setSelectedOttIndices(validSelected);
    } catch (err: any) {
      alert('Failed to preview OTT links: ' + (err.message || 'Error'));
    } finally {
      setOttLoading(false);
    }
  };

  const handleToggleOttRow = (idx: number) => {
    setSelectedOttIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSelectAllOtt = () => {
    if (selectedOttIndices.size === ottPreviewItems.length) {
      setSelectedOttIndices(new Set());
    } else {
      const allValid = new Set<number>();
      ottPreviewItems.forEach((item, idx) => {
        if (item.selectedMovie) allValid.add(idx);
      });
      setSelectedOttIndices(allValid);
    }
  };

  const handleSelectOttCandidate = (index: number, userMovieId: string) => {
    const item = ottPreviewItems[index];
    const cand = item.candidates.find((c: any) => c.user_movie_id === userMovieId);
    if (!cand) return;

    const nextItems = [...ottPreviewItems];
    nextItems[index] = {
      ...item,
      selectedMovie: cand,
      status: 'matched',
    };
    setOttPreviewItems(nextItems);
    setSelectedOttIndices(prev => new Set(prev).add(index));
  };

  const handleApplyOttLinks = async () => {
    const updates = Array.from(selectedOttIndices)
      .map(idx => ottPreviewItems[idx])
      .filter(item => item && item.selectedMovie)
      .map(item => ({
        userMovieId: item.selectedMovie.user_movie_id,
        providerName: item.providerName,
        directUrl: item.directUrl,
        replaceExisting: replaceExistingSources,
      }));

    if (updates.length === 0) return;

    setOttApplying(true);
    try {
      const res = await api.post('/sources/bulk-ott-apply', { updates });
      setOttResult(res.data?.data);
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      alert('Failed to apply OTT links: ' + (err.message || 'Error'));
    } finally {
      setOttApplying(false);
    }
  };

  const predefinedGenres: any[] = genresData?.predefined || [];
  const customGenres: any[] = genresData?.custom || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 0.5 }}>
          Import & Resource Center
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
          Bulk import movies to your library or update direct OTT streaming links for existing titles.
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            '& .MuiTab-root': {
              color: '#94A3B8',
              fontWeight: 700,
              fontSize: '0.95rem',
              textTransform: 'none',
              minHeight: 48,
              '&.Mui-selected': { color: '#38BDF8' },
            },
            '& .MuiTabs-indicator': { backgroundColor: '#38BDF8', height: 3 },
          }}
        >
          <Tab icon={<MovieIcon sx={{ mr: 1, fontSize: 20 }} />} iconPosition="start" label="Import New Movies" value="import" />
          <Tab icon={<LinkIcon sx={{ mr: 1, fontSize: 20 }} />} iconPosition="start" label="Update OTT Links" value="ott" />
        </Tabs>
      </Box>

      {/* TAB 1: MOVIE IMPORT */}
      {activeTab === 'import' && (
        <>
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

          {importResult && (
            <Alert
              severity="success"
              icon={<CheckCircleOutlineIcon fontSize="inherit" />}
              sx={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              Successfully imported {importResult.importedCount} movies!
            </Alert>
          )}

          {matches.length > 0 && (
            <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {/* Genre Selector */}
              <Paper sx={{ p: 2, mb: 2.5, backgroundColor: '#111827', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CategoryIcon sx={{ color: '#38BDF8', fontSize: 18 }} />
                  <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                    Assign Genre to Imported Movies (Optional)
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

              {/* Watchlist Destination Toolbar */}
              <Paper sx={{ p: 2, mb: 3, backgroundColor: '#111827', border: '1px solid rgba(229, 169, 60, 0.25)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: 'rgba(229, 169, 60, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                      sx={{ color: '#F8FAFC', backgroundColor: '#0B0F19' }}
                    >
                      <MenuItem value="none"><em>None (Import into library only)</em></MenuItem>
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
                      sx={{ minWidth: 220, backgroundColor: '#0B0F19', input: { color: '#F8FAFC' } }}
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
                  disabled={selectedIndices.size === 0 || committing}
                  sx={{ fontWeight: 700, px: 3 }}
                >
                  {committing ? 'Importing...' : `Add ${selectedIndices.size} Selected Movies to Library`}
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
                        <TableCell sx={{ color: '#F8FAFC', fontWeight: 600 }}>{item.inputTitle}</TableCell>
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
                        <TableCell>
                          {item.status === 'ambiguous' && item.candidates.length > 1 ? (
                            <Select
                              size="small"
                              value={m?.id || ''}
                              onChange={(e) => handleDisambiguate(idx, Number(e.target.value))}
                              sx={{ color: '#F8FAFC', fontSize: '0.8rem', minWidth: 180 }}
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
        </>
      )}

      {/* TAB 2: UPDATE OTT LINKS */}
      {activeTab === 'ott' && (
        <>
          <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <Typography variant="subtitle2" sx={{ color: '#38BDF8', fontWeight: 700, mb: 0.5 }}>
              PASTE MOVIE OTT LINKS (ONE PER LINE)
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1.5 }}>
              Format: <code>Movie Title | Provider Name | Direct OTT URL</code>
            </Typography>

            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder={`The Greatest of All Time | Netflix | https://www.netflix.com/title/81234567\nVikram | Disney+ Hotstar | https://www.hotstar.com/in/movies/vikram/1260105307\nInterstellar | Prime Video | https://www.primevideo.com/detail/0STV48F47G`}
              value={ottInputText}
              onChange={(e) => setOttInputText(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Button
              variant="contained"
              color="primary"
              startIcon={ottLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
              onClick={handlePreviewOttLinks}
              disabled={ottLoading || !ottInputText.trim()}
              sx={{ fontWeight: 700, px: 3 }}
            >
              {ottLoading ? 'Matching Library Movies...' : 'Match & Preview OTT Links'}
            </Button>
          </Paper>

          {/* Success Alert */}
          {ottResult && (
            <Alert
              severity="success"
              icon={<CheckCircleOutlineIcon fontSize="inherit" />}
              sx={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              Successfully updated direct OTT links for {ottResult.updatedCount} movies!
            </Alert>
          )}

          {/* OTT Preview Table */}
          {ottPreviewItems.length > 0 && (
            <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#38BDF8', fontWeight: 700 }}>
                    REVIEW OTT LINK MATCHES ({selectedOttIndices.size} of {ottPreviewItems.length} selected)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                    Review matched movies before applying changes to your library.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Checkbox
                      size="small"
                      checked={replaceExistingSources}
                      onChange={(e) => setReplaceExistingSources(e.target.checked)}
                      sx={{ color: '#38BDF8', '&.Mui-checked': { color: '#38BDF8' } }}
                    />
                    <Typography variant="body2" sx={{ color: '#CBD5E1', fontSize: '0.85rem' }}>
                      Replace existing link for same provider
                    </Typography>
                  </Box>

                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<CheckCircleOutlineIcon />}
                    onClick={handleApplyOttLinks}
                    disabled={selectedOttIndices.size === 0 || ottApplying}
                    sx={{ fontWeight: 700, px: 3 }}
                  >
                    {ottApplying ? 'Updating...' : `Apply OTT Links (${selectedOttIndices.size})`}
                  </Button>
                </Box>
              </Box>

              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={ottPreviewItems.length > 0 && selectedOttIndices.size === ottPreviewItems.length}
                        indeterminate={selectedOttIndices.size > 0 && selectedOttIndices.size < ottPreviewItems.length}
                        onChange={handleSelectAllOtt}
                        sx={{ color: '#38BDF8', '&.Mui-checked': { color: '#38BDF8' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Your Input Title</TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Matched Library Movie</TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Target Provider</TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Direct URL</TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ottPreviewItems.map((item, idx) => {
                    const isSelected = selectedOttIndices.has(idx);
                    const m = item.selectedMovie;
                    return (
                      <TableRow key={idx} sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            disabled={!m}
                            onChange={() => handleToggleOttRow(idx)}
                            sx={{ color: '#38BDF8', '&.Mui-checked': { color: '#38BDF8' } }}
                          />
                        </TableCell>
                        <TableCell sx={{ color: '#F8FAFC', fontWeight: 600 }}>{item.inputTitle}</TableCell>
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
                                <Typography variant="caption" sx={{ color: '#64748B' }}>{m.release_year || 'Library Title'}</Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: '#EF4444' }}>Not found in library</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <OttBadge providerName={item.providerName} size="small" />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Tooltip title={item.directUrl}>
                            <Box
                              component="a"
                              href={item.directUrl}
                              target="_blank"
                              rel="noreferrer"
                              sx={{
                                color: '#38BDF8',
                                fontSize: '0.8rem',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 0.5,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%',
                                '&:hover': { textDecoration: 'underline' },
                              }}
                            >
                              {item.directUrl}
                              <OpenInNewIcon sx={{ fontSize: 12 }} />
                            </Box>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {item.status === 'ambiguous' && item.candidates.length > 1 ? (
                            <Select
                              size="small"
                              value={m?.user_movie_id || ''}
                              onChange={(e) => handleSelectOttCandidate(idx, String(e.target.value))}
                              sx={{ color: '#F8FAFC', fontSize: '0.8rem', minWidth: 160 }}
                            >
                              {item.candidates.map((cand: any) => (
                                <MenuItem key={cand.user_movie_id} value={cand.user_movie_id}>{cand.title}</MenuItem>
                              ))}
                            </Select>
                          ) : item.status === 'matched' ? (
                            <Chip label="Matched" size="small" sx={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 600 }} />
                          ) : (
                            <Chip label="Not Found" size="small" sx={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444' }} />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};
