import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  InputBase,
  IconButton,
  Typography,
  Paper,
  ClickAwayListener,
  Menu,
  MenuItem,
  Chip,
  CircularProgress,
  Button,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import TvIcon from '@mui/icons-material/Tv';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
import PublicIcon from '@mui/icons-material/Public';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';

export type SearchCategory = 'all' | 'movie' | 'tv' | 'watchlist' | 'tmdb';

interface ImdbHeaderSearchProps {
  onOpenAddModalWithQuery?: (initialQuery: string) => void;
}

export const ImdbHeaderSearch: React.FC<ImdbHeaderSearchProps> = ({ onOpenAddModalWithQuery }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [categoryAnchorEl, setCategoryAnchorEl] = useState<null | HTMLElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
      setSelectedIndex(-1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Global keyboard shortcut ('/' or 'Cmd+K' / 'Ctrl+K') to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);

      if (e.key === '/' && !isInputActive) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Library Results
  const { data: libraryData, isFetching: isLibraryLoading } = useQuery({
    queryKey: ['imdb-search-library', debouncedTerm, category],
    queryFn: async () => {
      if (!debouncedTerm || category === 'tmdb') return { movies: [] };
      const params = new URLSearchParams();
      params.append('search', debouncedTerm);
      params.append('limit', '8');
      if (category === 'movie') params.append('mediaType', 'movie');
      if (category === 'tv') params.append('mediaType', 'tv');

      const res = await api.get(`/movies?${params.toString()}`);
      return res.data?.data;
    },
    enabled: !!debouncedTerm && category !== 'tmdb',
  });

  // Fetch Watchlists Results (when in 'all' or 'watchlist' mode)
  const { data: watchlistsData } = useQuery({
    queryKey: ['imdb-search-watchlists'],
    queryFn: async () => {
      const res = await api.get('/watchlists?parentId=all&limit=1000');
      return res.data?.data;
    },
    enabled: !!debouncedTerm && (category === 'all' || category === 'watchlist'),
  });

  // Fetch TMDB Global Results (when 'tmdb' mode is selected)
  const { data: tmdbData, isFetching: isTmdbLoading } = useQuery({
    queryKey: ['imdb-search-tmdb', debouncedTerm],
    queryFn: async () => {
      if (!debouncedTerm || category !== 'tmdb') return { results: [] };
      const res = await api.get(`/tmdb/search?query=${encodeURIComponent(debouncedTerm)}`);
      return res.data?.data;
    },
    enabled: !!debouncedTerm && category === 'tmdb',
  });

  // Helper to prioritize titles starting with the search prefix, then word boundaries, then in-between matches
  const rankByPrefixPriority = <T extends { title?: string; name?: string; custom_title?: string }>(items: T[], query: string): T[] => {
    if (!query || !items.length) return items;
    const q = query.trim().toLowerCase();

    return [...items].sort((a, b) => {
      const titleA = (a.custom_title || a.title || a.name || '').toLowerCase();
      const titleB = (b.custom_title || b.title || b.name || '').toLowerCase();

      // Priority 0: Exact start of title (e.g. "Arrambam" or "Arrival" for "ar")
      const startsA = titleA.startsWith(q);
      const startsB = titleB.startsWith(q);
      if (startsA && !startsB) return -1;
      if (!startsA && startsB) return 1;

      // Priority 1: Word boundary start (e.g. "The Arrival" or "Spider-Man: Far From Home")
      const wordA = titleA.includes(' ' + q) || titleA.includes('-' + q) || titleA.includes(':' + q) || titleA.includes('(' + q);
      const wordB = titleB.includes(' ' + q) || titleB.includes('-' + q) || titleB.includes(':' + q) || titleB.includes('(' + q);
      if (wordA && !wordB) return -1;
      if (!wordA && wordB) return 1;

      // Priority 2: Substring position (earlier index in title has priority)
      const idxA = titleA.indexOf(q);
      const idxB = titleB.indexOf(q);
      if (idxA !== -1 && idxB !== -1 && idxA !== idxB) {
        return idxA - idxB;
      }
      if (idxA !== -1 && idxB === -1) return -1;
      if (idxA === -1 && idxB !== -1) return 1;

      return 0;
    });
  };

  const rawMovies = libraryData?.movies || [];
  const matchingMovies = rankByPrefixPriority(rawMovies, debouncedTerm);
  const allWatchlists = Array.isArray(watchlistsData) ? watchlistsData : (watchlistsData?.watchlists || []);
  const rawWatchlists = (category === 'all' || category === 'watchlist') && debouncedTerm
    ? allWatchlists.filter((w: any) => (w.name || '').toLowerCase().includes(debouncedTerm.toLowerCase()))
    : [];
  const matchingWatchlists = rankByPrefixPriority(rawWatchlists, debouncedTerm).slice(0, 4);
  const rawTmdb = tmdbData?.results || [];
  const matchingTmdb = rankByPrefixPriority(rawTmdb, debouncedTerm).slice(0, 6);

  const totalResultsCount =
    category === 'tmdb'
      ? matchingTmdb.length
      : matchingMovies.length + matchingWatchlists.length;

  const handleSelectMovie = (movie: any) => {
    setIsOpen(false);
    setSearchTerm('');
    navigate(`/movies/${movie.user_movie_id}`);
  };

  const handleSelectWatchlist = (wl: any) => {
    setIsOpen(false);
    setSearchTerm('');
    navigate('/watchlists');
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!debouncedTerm) return;
    setIsOpen(false);

    if (category === 'tmdb') {
      if (onOpenAddModalWithQuery) {
        onOpenAddModalWithQuery(debouncedTerm);
      }
    } else {
      const mediaParam = category === 'movie' ? '&mediaType=movie' : category === 'tv' ? '&mediaType=tv' : '';
      navigate(`/movies?search=${encodeURIComponent(debouncedTerm)}${mediaParam}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < totalResultsCount ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalResultsCount - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        if (category === 'tmdb') {
          const item = matchingTmdb[selectedIndex];
          if (item && onOpenAddModalWithQuery) {
            onOpenAddModalWithQuery(item.title || item.name || '');
            setIsOpen(false);
          }
        } else if (selectedIndex < matchingMovies.length) {
          handleSelectMovie(matchingMovies[selectedIndex]);
        } else {
          const wlIndex = selectedIndex - matchingMovies.length;
          if (matchingWatchlists[wlIndex]) {
            handleSelectWatchlist(matchingWatchlists[wlIndex]);
          }
        }
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const categoryLabels: Record<SearchCategory, { label: string; icon: React.ReactNode }> = {
    all: { label: 'All', icon: <LocalMoviesIcon sx={{ fontSize: 16 }} /> },
    movie: { label: 'Movies', icon: <LocalMoviesIcon sx={{ fontSize: 16 }} /> },
    tv: { label: 'Web Series', icon: <TvIcon sx={{ fontSize: 16 }} /> },
    watchlist: { label: 'Watchlists', icon: <FolderIcon sx={{ fontSize: 16 }} /> },
    tmdb: { label: 'Find on TMDB', icon: <PublicIcon sx={{ fontSize: 16 }} /> },
  };

  const placeholderText: Record<SearchCategory, string> = {
    all: 'Search your Cinema Sanctuary (titles, cast, directors)...',
    movie: 'Search movies in library...',
    tv: 'Search web series in library...',
    watchlist: 'Search collections and folders...',
    tmdb: 'Search new titles on TMDB to add to library...',
  };

  const isSearching = isLibraryLoading || isTmdbLoading;

  return (
    <ClickAwayListener onClickAway={() => setIsOpen(false)}>
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          width: { xs: '100%', md: 260, lg: 340, xl: 460 },
          maxWidth: '100%',
          zIndex: 1200,
        }}
      >
        {/* Main Search Bar Container */}
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#0F1523',
            border: isOpen ? '1.5px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: 2,
            boxShadow: isOpen ? '0 0 16px rgba(229, 169, 60, 0.25)' : '0 2px 8px rgba(0,0,0,0.4)',
            transition: 'all 0.2s ease',
            overflow: 'hidden',
          }}
        >
          {/* Category Dropdown Selector (IMDb Style) */}
          <Button
            size="small"
            onClick={(e) => setCategoryAnchorEl(e.currentTarget)}
            endIcon={<ArrowDropDownIcon sx={{ fontSize: 18, color: '#E5A93C', ml: { xs: -0.5, sm: 0 } }} />}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: '#F8FAFC',
              fontWeight: 700,
              fontSize: '0.78rem',
              textTransform: 'none',
              px: { xs: 0.8, sm: 1.5 },
              py: 0.8,
              borderRadius: 0,
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              minWidth: 'auto',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': {
                backgroundColor: 'rgba(229, 169, 60, 0.15)',
                color: '#E5A93C',
              },
            }}
          >
            <Box sx={{ display: { xs: 'flex', sm: 'none' }, color: '#E5A93C' }}>
              {categoryLabels[category].icon}
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {categoryLabels[category].label}
            </Box>
          </Button>

          {/* Category Menu */}
          <Menu
            anchorEl={categoryAnchorEl}
            open={Boolean(categoryAnchorEl)}
            onClose={() => setCategoryAnchorEl(null)}
            PaperProps={{
              sx: {
                backgroundColor: '#0B0F19',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 2,
                minWidth: 180,
                mt: 0.5,
              },
            }}
          >
            {(Object.keys(categoryLabels) as SearchCategory[]).map((cat) => (
              <MenuItem
                key={cat}
                selected={category === cat}
                onClick={() => {
                  setCategory(cat);
                  setCategoryAnchorEl(null);
                  inputRef.current?.focus();
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  fontSize: '0.82rem',
                  fontWeight: category === cat ? 700 : 500,
                  color: category === cat ? '#E5A93C' : '#F8FAFC',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(229, 169, 60, 0.15)',
                  },
                }}
              >
                <Box sx={{ color: category === cat ? '#E5A93C' : '#94A3B8', display: 'flex' }}>
                  {categoryLabels[cat].icon}
                </Box>
                {categoryLabels[cat].label}
              </MenuItem>
            ))}
          </Menu>

          {/* Search Input Field */}
          <InputBase
            inputRef={inputRef}
            placeholder={placeholderText[category]}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            sx={{
              color: '#F8FAFC',
              fontSize: '0.85rem',
              px: { xs: 1, sm: 1.5 },
              py: 0.6,
              flexGrow: 1,
              minWidth: 0,
              '& input::placeholder': {
                color: '#64748B',
                opacity: 1,
              },
            }}
          />

          {/* Loading Indicator or Clear Button */}
          {isSearching ? (
            <CircularProgress size={16} sx={{ color: '#E5A93C', mr: 1 }} />
          ) : searchTerm ? (
            <IconButton
              size="small"
              onClick={() => {
                setSearchTerm('');
                setDebouncedTerm('');
                inputRef.current?.focus();
              }}
              sx={{ color: '#94A3B8', mr: 0.5, p: 0.5, '&:hover': { color: '#F8FAFC' } }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          ) : (
            <Chip
              label="/"
              size="small"
              sx={{
                display: { xs: 'none', sm: 'inline-flex' },
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                color: '#64748B',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                mr: 1,
                cursor: 'pointer',
              }}
              onClick={() => inputRef.current?.focus()}
            />
          )}

          {/* Search Submit Action Button */}
          <IconButton
            type="submit"
            size="small"
            sx={{
              color: '#94A3B8',
              mr: 0.8,
              p: 0.8,
              borderRadius: 1.5,
              '&:hover': {
                color: '#E5A93C',
                backgroundColor: 'rgba(229, 169, 60, 0.1)',
              },
            }}
          >
            <SearchIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>

        {/* Live Interactive Results Dropdown (IMDb Floating Panel) */}
        {isOpen && debouncedTerm && (
          <Paper
            elevation={16}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#0B0F19',
              border: '1px solid rgba(229, 169, 60, 0.35)',
              borderRadius: 2.5,
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.85), 0 0 20px rgba(229, 169, 60, 0.15)',
              backdropFilter: 'blur(20px)',
              maxHeight: 520,
              overflowY: 'auto',
              p: 1,
              zIndex: 1300,
            }}
          >
            {/* Header Result Count */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 0.8, borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, letterSpacing: '0.05em' }}>
                {category === 'tmdb' ? 'TMDB GLOBAL SEARCH' : 'SANCTUARY MATCHES'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 600 }}>
                {totalResultsCount} found
              </Typography>
            </Box>

            {/* Category: TMDB Search Results */}
            {category === 'tmdb' && (
              <Box sx={{ py: 0.5 }}>
                {matchingTmdb.map((item: any, idx: number) => {
                  const isSelected = selectedIndex === idx;
                  const posterUrl = item.poster_path
                    ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
                    : null;
                  const year = (item.release_date || item.first_air_date || '').substring(0, 4);

                  return (
                    <Box
                      key={item.id}
                      onClick={() => {
                        if (onOpenAddModalWithQuery) {
                          onOpenAddModalWithQuery(item.title || item.name);
                        }
                        setIsOpen(false);
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(229, 169, 60, 0.15)' : 'transparent',
                        border: isSelected ? '1px solid rgba(229, 169, 60, 0.4)' : '1px solid transparent',
                        '&:hover': {
                          backgroundColor: 'rgba(229, 169, 60, 0.15)',
                        },
                      }}
                    >
                      {posterUrl ? (
                        <Box
                          component="img"
                          src={posterUrl}
                          alt={item.title || item.name}
                          sx={{ width: 40, height: 58, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
                        />
                      ) : (
                        <Box sx={{ width: 40, height: 58, backgroundColor: '#1E293B', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <LocalMoviesIcon sx={{ color: '#64748B', fontSize: 20 }} />
                        </Box>
                      )}

                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography noWrap variant="body2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                          {item.title || item.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
                          {year && (
                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                              {year}
                            </Typography>
                          )}
                          <Chip
                            label={item.media_type === 'tv' ? 'Web Series' : 'Movie'}
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              backgroundColor: item.media_type === 'tv' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                              color: item.media_type === 'tv' ? '#C084FC' : '#38BDF8',
                            }}
                          />
                        </Box>
                        {item.overview && (
                          <Typography variant="caption" sx={{ color: '#64748B', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.3 }}>
                            {item.overview}
                          </Typography>
                        )}
                      </Box>

                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                        sx={{ fontSize: '0.72rem', fontWeight: 700, px: 1, py: 0.4, flexShrink: 0 }}
                      >
                        Add
                      </Button>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Category: Library Movies & Series Matches */}
            {category !== 'tmdb' && (
              <Box sx={{ py: 0.5 }}>
                {matchingMovies.map((movie: any, idx: number) => {
                  const isSelected = selectedIndex === idx;
                  const posterUrl = movie.poster_path
                    ? (movie.poster_path.startsWith('http') ? movie.poster_path : `https://image.tmdb.org/t/p/w92${movie.poster_path}`)
                    : null;
                  const year = (movie.release_date || '').substring(0, 4);
                  const isTv = movie.media_type === 'tv';

                  return (
                    <Box
                      key={movie.user_movie_id}
                      onClick={() => handleSelectMovie(movie)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1,
                        borderRadius: 1.5,
                        cursor: 'pointer',
                        backgroundColor: isSelected ? 'rgba(229, 169, 60, 0.15)' : 'transparent',
                        border: isSelected ? '1px solid rgba(229, 169, 60, 0.4)' : '1px solid transparent',
                        '&:hover': {
                          backgroundColor: 'rgba(229, 169, 60, 0.15)',
                        },
                      }}
                    >
                      {posterUrl ? (
                        <Box
                          component="img"
                          src={posterUrl}
                          alt={movie.title}
                          sx={{ width: 40, height: 58, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
                        />
                      ) : (
                        <Box sx={{ width: 40, height: 58, backgroundColor: '#1E293B', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isTv ? <TvIcon sx={{ color: '#64748B', fontSize: 20 }} /> : <LocalMoviesIcon sx={{ color: '#64748B', fontSize: 20 }} />}
                        </Box>
                      )}

                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography noWrap variant="body2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                            {movie.title}
                          </Typography>
                          <Chip
                            label={isTv ? 'Web Series' : 'Movie'}
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: '0.62rem',
                              fontWeight: 700,
                              backgroundColor: isTv ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                              color: isTv ? '#C084FC' : '#38BDF8',
                            }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.3, flexWrap: 'wrap' }}>
                          {year && (
                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                              {year}
                            </Typography>
                          )}
                          {movie.director && (
                            <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              <PersonIcon sx={{ fontSize: 12 }} /> {movie.director}
                            </Typography>
                          )}
                          {movie.personal_rating && (
                            <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.3 }}>
                              <StarIcon sx={{ fontSize: 12 }} /> {movie.personal_rating.toFixed(1)}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Watch Status Badge */}
                      <Chip
                        icon={
                          movie.watch_status === 'watched' ? (
                            <CheckCircleIcon sx={{ fontSize: '13px !important', color: '#10B981 !important' }} />
                          ) : movie.watch_status === 'watching' ? (
                            <PlayCircleOutlineIcon sx={{ fontSize: '13px !important', color: '#38BDF8 !important' }} />
                          ) : (
                            <VisibilityIcon sx={{ fontSize: '13px !important', color: '#94A3B8 !important' }} />
                          )
                        }
                        label={movie.watch_status === 'watched' ? 'Watched' : movie.watch_status === 'watching' ? 'Watching' : 'Unwatched'}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor:
                            movie.watch_status === 'watched'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : movie.watch_status === 'watching'
                              ? 'rgba(56, 189, 248, 0.15)'
                              : 'rgba(255, 255, 255, 0.05)',
                          color:
                            movie.watch_status === 'watched'
                              ? '#10B981'
                              : movie.watch_status === 'watching'
                              ? '#38BDF8'
                              : '#94A3B8',
                          flexShrink: 0,
                        }}
                      />
                    </Box>
                  );
                })}

                {/* Matching Watchlists */}
                {matchingWatchlists.length > 0 && (
                  <>
                    <Divider sx={{ my: 1, borderColor: 'rgba(255, 255, 255, 0.06)' }} />
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, px: 1, display: 'block', mb: 0.5 }}>
                      MATCHING WATCHLISTS & FOLDERS
                    </Typography>
                    {matchingWatchlists.map((wl: any, idx: number) => {
                      const itemIdx = matchingMovies.length + idx;
                      const isSelected = selectedIndex === itemIdx;

                      return (
                        <Box
                          key={wl.id}
                          onClick={() => handleSelectWatchlist(wl)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            p: 1,
                            borderRadius: 1.5,
                            cursor: 'pointer',
                            backgroundColor: isSelected ? 'rgba(229, 169, 60, 0.15)' : 'transparent',
                            '&:hover': { backgroundColor: 'rgba(229, 169, 60, 0.15)' },
                          }}
                        >
                          <FolderIcon sx={{ color: '#E5A93C', fontSize: 22 }} />
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                              {wl.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>
                              {wl.movie_count ?? 0} movies contained
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </>
                )}
              </Box>
            )}

            {/* Empty State / Search Elsewhere suggestion */}
            {totalResultsCount === 0 && !isSearching && (
              <Box sx={{ p: 2.5, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1 }}>
                  No titles found in your sanctuary for "<strong>{debouncedTerm}</strong>"
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<PublicIcon />}
                  onClick={() => {
                    setCategory('tmdb');
                    inputRef.current?.focus();
                  }}
                  sx={{ fontSize: '0.78rem', fontWeight: 700 }}
                >
                  Search on TMDB Globally
                </Button>
              </Box>
            )}

            {/* Footer "See All Results" */}
            {totalResultsCount > 0 && (
              <Box
                onClick={() => handleSearchSubmit()}
                sx={{
                  p: 1.2,
                  mt: 0.5,
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  '&:hover': {
                    backgroundColor: 'rgba(229, 169, 60, 0.15)',
                    color: '#E5A93C',
                  },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#E5A93C' }}>
                  See all results for "{debouncedTerm}" in Library &rarr;
                </Typography>
              </Box>
            )}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
};
