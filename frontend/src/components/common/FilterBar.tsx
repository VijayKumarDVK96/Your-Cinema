import React, { useState, useEffect } from 'react';
import {
  Box,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Slider,
  Popover,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Badge,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import StarIcon from '@mui/icons-material/Star';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { Tag, Genre } from '../../types/index.js';

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1950;

export interface FilterBarProps {
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  selectedMediaType?: 'all' | 'movie' | 'tv';
  onMediaTypeChange?: (mediaType: 'all' | 'movie' | 'tv') => void;
  selectedGenre?: string | number;
  onGenreChange: (genreId?: string | number) => void;
  selectedLanguage?: string;
  onLanguageChange: (language?: string) => void;
  selectedOtt?: string;
  onOttChange: (ott?: string) => void;
  selectedTag?: string;
  onTagChange: (tagId?: string) => void;
  ratingRange?: [number, number];
  onRatingRangeChange?: (range: [number, number]) => void;
  yearRange?: [number, number];
  onYearRangeChange?: (range: [number, number]) => void;
  isFavorite?: boolean;
  onFavoriteToggle: () => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  availableTags: Tag[];
  availableGenres?: { predefined: Genre[]; custom: Genre[]; all: Genre[] } | Genre[];
  onReset: () => void;
}

const OTT_OPTIONS = [
  { value: 'Aha', label: 'Aha', color: '#FF5000' },
  { value: 'Apple TV+', label: 'Apple TV+', color: '#A3AAAE' },
  { value: 'Google Drive', label: 'Google Drive', color: '#34A853' },
  { value: 'JioCinema', label: 'JioCinema', color: '#D80075' },
  { value: 'JioHotstar', label: 'JioHotstar', color: '#113CCF' },
  { value: 'Netflix', label: 'Netflix', color: '#E50914' },
  { value: 'Amazon Prime Video', label: 'Prime Video', color: '#00A8E1' },
  { value: 'Sony LIV', label: 'Sony LIV', color: '#00E5FF' },
  { value: 'Sun NXT', label: 'Sun NXT', color: '#FF6B00' },
  { value: 'Vi Movies & TV', label: 'Vi Movies & TV', color: '#E40046' },
  { value: 'YouTube', label: 'YouTube', color: '#FF0000' },
  { value: 'Zee5', label: 'Zee5', color: '#8230C6' },
  { value: 'unassigned', label: 'Unassigned', color: '#94A3B8' },
];

const GENRE_OPTIONS = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 9648, name: 'Mystery' },
  { id: 878, name: 'Science Fiction' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
];

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ko', name: 'Korean' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm = '',
  onSearchChange,
  status,
  onStatusChange,
  selectedMediaType = 'all',
  onMediaTypeChange,
  selectedGenre,
  onGenreChange,
  selectedOtt,
  onOttChange,
  selectedLanguage,
  onLanguageChange,
  selectedTag,
  onTagChange,
  ratingRange = [1, 5],
  onRatingRangeChange,
  yearRange = [MIN_YEAR, CURRENT_YEAR],
  onYearRangeChange,
  isFavorite,
  onFavoriteToggle,
  sortBy,
  onSortChange,
  availableTags,
  availableGenres,
  onReset,
}) => {
  // Local state for debounced search
  const [searchInput, setSearchInput] = useState<string>(searchTerm);

  // Local state for popovers
  const [ratingAnchorEl, setRatingAnchorEl] = useState<null | HTMLElement>(null);
  const [localRatingRange, setLocalRatingRange] = useState<[number, number]>(ratingRange);

  const [yearAnchorEl, setYearAnchorEl] = useState<null | HTMLElement>(null);
  const [localYearRange, setLocalYearRange] = useState<[number, number]>(yearRange);

  // Sync search input from parent if updated externally
  useEffect(() => {
    setSearchInput(searchTerm);
  }, [searchTerm]);

  // Debounced search handler (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange && searchInput !== searchTerm) {
        onSearchChange(searchInput);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, onSearchChange, searchTerm]);

  // Sync rating range prop
  useEffect(() => {
    setLocalRatingRange(ratingRange);
  }, [ratingRange[0], ratingRange[1]]);

  // Sync year range prop
  useEffect(() => {
    setLocalYearRange(yearRange);
  }, [yearRange[0], yearRange[1]]);

  // Debounced notification for rating range
  useEffect(() => {
    if (localRatingRange[0] === ratingRange[0] && localRatingRange[1] === ratingRange[1]) {
      return;
    }
    const timer = setTimeout(() => {
      if (onRatingRangeChange) {
        onRatingRangeChange(localRatingRange);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localRatingRange, onRatingRangeChange, ratingRange]);

  // Debounced notification for year range
  useEffect(() => {
    if (localYearRange[0] === yearRange[0] && localYearRange[1] === yearRange[1]) {
      return;
    }
    const timer = setTimeout(() => {
      if (onYearRangeChange) {
        onYearRangeChange(localYearRange);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localYearRange, onYearRangeChange, yearRange]);

  const rawCustom: Genre[] = Array.isArray(availableGenres)
    ? availableGenres.filter(g => !g.is_predefined)
    : (availableGenres?.custom || []);

  const rawPredefined: Genre[] = Array.isArray(availableGenres)
    ? availableGenres.filter(g => g.is_predefined)
    : (availableGenres?.predefined?.length
        ? availableGenres.predefined
        : GENRE_OPTIONS.map(g => ({ id: g.id, tmdb_id: g.id, name: g.name, is_predefined: true })));

  const allGenresMap = new Map<string, Genre>();
  [...rawCustom, ...rawPredefined].forEach((g) => {
    const key = (g.name || '').trim().toLowerCase();
    if (key && !allGenresMap.has(key)) {
      allGenresMap.set(key, g);
    }
  });
  const allGenresList: Genre[] = Array.from(allGenresMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const sortedTags: Tag[] = (availableTags || []).slice().sort((a, b) => a.name.localeCompare(b.name));

  // Count active non-default filters
  let activeFilterCount = 0;
  if (status !== 'all') activeFilterCount++;
  if (selectedMediaType !== 'all') activeFilterCount++;
  if (selectedGenre !== undefined && selectedGenre !== null && selectedGenre !== '') activeFilterCount++;
  if (selectedLanguage) activeFilterCount++;
  if (selectedOtt) activeFilterCount++;
  if (selectedTag) activeFilterCount++;
  if (localRatingRange[0] > 1 || localRatingRange[1] < 5) activeFilterCount++;
  if (localYearRange[0] > MIN_YEAR || localYearRange[1] < CURRENT_YEAR) activeFilterCount++;
  if (isFavorite) activeFilterCount++;
  if (searchInput.trim()) activeFilterCount++;

  const isYearActive = localYearRange[0] > MIN_YEAR || localYearRange[1] < CURRENT_YEAR;
  const isRatingActive = localRatingRange[0] > 1 || localRatingRange[1] < 5;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.75,
        p: { xs: 1.75, sm: 2.25 },
        backgroundColor: '#0B0F19',
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36)',
        backdropFilter: 'blur(12px)',
        mb: 3,
      }}
    >
      {/* ROW 1: Search & Format/Status Quick Toggles */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        {/* Debounced Search Input */}
        <TextField
          size="small"
          placeholder="Filter titles, directors, actors..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#E5A93C', fontSize: 18 }} />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setSearchInput('');
                    if (onSearchChange) onSearchChange('');
                  }}
                  sx={{ color: '#94A3B8', p: 0.2 }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            flex: { xs: '1 1 100%', sm: '1 1 240px', md: '1 1 280px' },
            maxWidth: { sm: 380 },
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 2,
              color: '#F8FAFC',
              fontSize: '0.875rem',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.12)' },
              '&:hover fieldset': { borderColor: 'rgba(229, 169, 60, 0.5)' },
              '&.Mui-focused fieldset': { borderColor: '#E5A93C', borderWidth: 1 },
            },
          }}
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, ml: 'auto' }}>
          {/* Format Toggle */}
          {onMediaTypeChange && (
            <ToggleButtonGroup
              value={selectedMediaType}
              exclusive
              onChange={(_, val) => val && onMediaTypeChange(val)}
              size="small"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 2,
                p: 0.3,
                border: '1px solid rgba(255, 255, 255, 0.06)',
                '& .MuiToggleButton-root': {
                  color: '#94A3B8',
                  border: 'none',
                  px: 1.6,
                  py: 0.5,
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  borderRadius: 1.5,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(168, 85, 247, 0.22)',
                    color: '#F8FAFC',
                    fontWeight: 700,
                    border: '1px solid rgba(168, 85, 247, 0.45)',
                    '&:hover': {
                      backgroundColor: 'rgba(168, 85, 247, 0.3)',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="all">All Formats</ToggleButton>
              <ToggleButton value="movie">Movies</ToggleButton>
              <ToggleButton value="tv">Web Series</ToggleButton>
            </ToggleButtonGroup>
          )}

          {/* Status Toggle */}
          <ToggleButtonGroup
            value={status}
            exclusive
            onChange={(_, val) => val && onStatusChange(val)}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 2,
              p: 0.3,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              '& .MuiToggleButton-root': {
                color: '#94A3B8',
                border: 'none',
                px: 1.6,
                py: 0.5,
                fontWeight: 600,
                fontSize: '0.78rem',
                textTransform: 'none',
                borderRadius: 1.5,
                '&.Mui-selected': {
                  backgroundColor: '#E5A93C',
                  color: '#090D16',
                  fontWeight: 700,
                  '&:hover': {
                    backgroundColor: '#F5C869',
                  },
                },
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="unwatched">Unwatched</ToggleButton>
            <ToggleButton value="watching">Watching</ToggleButton>
            <ToggleButton value="watched">Watched</ToggleButton>
          </ToggleButtonGroup>

          {/* Favorite Toggle Button */}
          <Tooltip title={isFavorite ? 'Showing Favorites Only' : 'Filter Favorites'}>
            <IconButton
              onClick={onFavoriteToggle}
              sx={{
                width: 34,
                height: 34,
                backgroundColor: isFavorite ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                color: isFavorite ? '#EF4444' : '#64748B',
                border: isFavorite ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                '&:hover': { color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.15)' },
              }}
            >
              {isFavorite ? <FavoriteIcon sx={{ fontSize: 18 }} /> : <FavoriteBorderIcon sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ROW 2: Dropdowns & Detailed Filter Controls */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25 }}>
        {/* Genre Dropdown */}
        <FormControl size="small" sx={{ minWidth: 130, flex: '1 1 130px', maxWidth: 180 }}>
          <InputLabel sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>Genre</InputLabel>
          <Select
            value={selectedGenre !== undefined && selectedGenre !== null ? String(selectedGenre) : ''}
            label="Genre"
            onChange={(e) => {
              const val = e.target.value;
              onGenreChange(val ? val : undefined);
            }}
            sx={{
              color: '#F8FAFC',
              fontSize: '0.85rem',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E5A93C' },
            }}
          >
            <MenuItem value=""><em>All Genres</em></MenuItem>
            {allGenresList.map((g) => (
              <MenuItem key={g.id || g.name} value={String(g.tmdb_id || g.id || g.name)}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, width: '100%' }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: g.color || '#E5A93C',
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.85rem' }}>
                    {g.name}
                  </Typography>
                  {g.movie_count !== undefined && (
                    <Typography variant="caption" sx={{ color: '#64748B', ml: 'auto' }}>
                      ({g.movie_count})
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Language Dropdown */}
        <FormControl size="small" sx={{ minWidth: 120, flex: '1 1 120px', maxWidth: 160 }}>
          <InputLabel sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>Language</InputLabel>
          <Select
            value={selectedLanguage || ''}
            label="Language"
            onChange={(e) => onLanguageChange(e.target.value || undefined)}
            sx={{
              color: '#F8FAFC',
              fontSize: '0.85rem',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E5A93C' },
            }}
          >
            <MenuItem value=""><em>All Languages</em></MenuItem>
            {LANGUAGE_OPTIONS.map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>{lang.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* OTT Platform Dropdown */}
        <FormControl size="small" sx={{ minWidth: 140, flex: '1 1 140px', maxWidth: 180 }}>
          <InputLabel sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>OTT Platform</InputLabel>
          <Select
            value={selectedOtt || ''}
            label="OTT Platform"
            onChange={(e) => onOttChange(e.target.value || undefined)}
            sx={{
              color: '#F8FAFC',
              fontSize: '0.85rem',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E5A93C' },
            }}
          >
            <MenuItem value=""><em>All Streaming</em></MenuItem>
            {OTT_OPTIONS.map((ott) => (
              <MenuItem key={ott.value} value={ott.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: ott.color,
                    }}
                  />
                  <span>{ott.label}</span>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Year Range Button & Popover Filter */}
        <Box>
          <Button
            size="small"
            onClick={(e) => setYearAnchorEl(e.currentTarget)}
            sx={{
              height: 38,
              px: 1.75,
              color: isYearActive ? '#38BDF8' : '#F8FAFC',
              backgroundColor: isYearActive ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: isYearActive ? '1px solid #38BDF8' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.82rem',
              fontWeight: isYearActive ? 700 : 500,
              '&:hover': {
                backgroundColor: isYearActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                borderColor: isYearActive ? '#38BDF8' : 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <CalendarMonthIcon sx={{ fontSize: 16, mr: 0.8, color: isYearActive ? '#38BDF8' : '#94A3B8' }} />
            {isYearActive
              ? (localYearRange[0] === localYearRange[1] ? `Year: ${localYearRange[0]}` : `Year: ${localYearRange[0]} – ${localYearRange[1]}`)
              : 'Year'}
          </Button>

          <Popover
            open={Boolean(yearAnchorEl)}
            anchorEl={yearAnchorEl}
            onClose={() => setYearAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            PaperProps={{
              sx: {
                p: 2.5,
                width: 310,
                backgroundColor: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 2.5,
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                Release Year Filter
              </Typography>
              <Chip
                label={localYearRange[0] === localYearRange[1] ? `${localYearRange[0]}` : `${localYearRange[0]} – ${localYearRange[1]}`}
                size="small"
                sx={{ backgroundColor: '#38BDF8', color: '#090D16', fontWeight: 800, fontSize: '0.72rem' }}
              />
            </Box>

            {/* Slider */}
            <Box sx={{ px: 1, py: 1 }}>
              <Slider
                value={localYearRange}
                onChange={(_, val) => setLocalYearRange(val as [number, number])}
                onChangeCommitted={(_, val) => {
                  const range = val as [number, number];
                  setLocalYearRange(range);
                  if (onYearRangeChange) onYearRangeChange(range);
                }}
                min={MIN_YEAR}
                max={CURRENT_YEAR}
                step={1}
                valueLabelDisplay="auto"
                marks={[
                  { value: 1950, label: '1950' },
                  { value: 1970, label: '1970' },
                  { value: 1990, label: '1990' },
                  { value: 2010, label: '2010' },
                  { value: CURRENT_YEAR, label: `${CURRENT_YEAR}` },
                ]}
                sx={{
                  color: '#38BDF8',
                  '& .MuiSlider-thumb': { backgroundColor: '#38BDF8' },
                  '& .MuiSlider-track': { backgroundColor: '#38BDF8' },
                  '& .MuiSlider-markLabel': { color: '#64748B', fontSize: '0.68rem' },
                }}
              />
            </Box>

            {/* Quick decade presets */}
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, display: 'block', mt: 2, mb: 1 }}>
              QUICK DECADE PRESETS
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
              <Chip
                label="All (1950-Now)"
                size="small"
                onClick={() => {
                  const val: [number, number] = [MIN_YEAR, CURRENT_YEAR];
                  setLocalYearRange(val);
                  if (onYearRangeChange) onYearRangeChange(val);
                }}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.06)', color: '#94A3B8', fontSize: '0.7rem' }}
              />
              <Chip
                label="2020s"
                size="small"
                onClick={() => {
                  const val: [number, number] = [2020, CURRENT_YEAR];
                  setLocalYearRange(val);
                  if (onYearRangeChange) onYearRangeChange(val);
                }}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontSize: '0.7rem' }}
              />
              <Chip
                label="2010s"
                size="small"
                onClick={() => {
                  const val: [number, number] = [2010, 2019];
                  setLocalYearRange(val);
                  if (onYearRangeChange) onYearRangeChange(val);
                }}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontSize: '0.7rem' }}
              />
              <Chip
                label="2000s"
                size="small"
                onClick={() => {
                  const val: [number, number] = [2000, 2009];
                  setLocalYearRange(val);
                  if (onYearRangeChange) onYearRangeChange(val);
                }}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontSize: '0.7rem' }}
              />
              <Chip
                label="1990s"
                size="small"
                onClick={() => {
                  const val: [number, number] = [1990, 1999];
                  setLocalYearRange(val);
                  if (onYearRangeChange) onYearRangeChange(val);
                }}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontSize: '0.7rem' }}
              />
              <Chip
                label="Classic (1950-1989)"
                size="small"
                onClick={() => {
                  const val: [number, number] = [1950, 1989];
                  setLocalYearRange(val);
                  if (onYearRangeChange) onYearRangeChange(val);
                }}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontSize: '0.7rem' }}
              />
            </Box>
          </Popover>
        </Box>

        {/* My Rating Button & Popover Filter */}
        <Box>
          <Button
            size="small"
            onClick={(e) => setRatingAnchorEl(e.currentTarget)}
            sx={{
              height: 38,
              px: 1.75,
              color: isRatingActive ? '#E5A93C' : '#F8FAFC',
              backgroundColor: isRatingActive ? 'rgba(229, 169, 60, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: isRatingActive ? '1px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.82rem',
              fontWeight: isRatingActive ? 700 : 500,
              '&:hover': {
                backgroundColor: isRatingActive ? 'rgba(229, 169, 60, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                borderColor: isRatingActive ? '#E5A93C' : 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <StarIcon sx={{ fontSize: 16, mr: 0.8, color: isRatingActive ? '#E5A93C' : '#94A3B8' }} />
            {isRatingActive ? `⭐ ${localRatingRange[0].toFixed(1)} – ${localRatingRange[1].toFixed(1)}` : 'Rating'}
          </Button>

          <Popover
            open={Boolean(ratingAnchorEl)}
            anchorEl={ratingAnchorEl}
            onClose={() => setRatingAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            transformOrigin={{ vertical: 'top', horizontal: 'center' }}
            PaperProps={{
              sx: {
                p: 2.5,
                width: 280,
                backgroundColor: '#0F172A',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 2.5,
                boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                Filter Rating Range
              </Typography>
              <Chip
                label={`⭐ ${localRatingRange[0].toFixed(1)} to ${localRatingRange[1].toFixed(1)}`}
                size="small"
                sx={{ backgroundColor: '#E5A93C', color: '#090D16', fontWeight: 800, fontSize: '0.72rem' }}
              />
            </Box>

            <Box sx={{ px: 1, py: 1 }}>
              <Slider
                value={localRatingRange}
                onChange={(_, val) => setLocalRatingRange(val as [number, number])}
                onChangeCommitted={(_, val) => {
                  const range = val as [number, number];
                  setLocalRatingRange(range);
                  if (onRatingRangeChange) onRatingRangeChange(range);
                }}
                min={1.0}
                max={5.0}
                step={0.5}
                valueLabelDisplay="auto"
                marks={[
                  { value: 1.0, label: '1' },
                  { value: 2.0, label: '2' },
                  { value: 3.0, label: '3' },
                  { value: 4.0, label: '4' },
                  { value: 5.0, label: '5' },
                ]}
                sx={{
                  color: '#E5A93C',
                  '& .MuiSlider-thumb': { backgroundColor: '#E5A93C' },
                  '& .MuiSlider-track': { backgroundColor: '#E5A93C' },
                  '& .MuiSlider-markLabel': { color: '#64748B', fontSize: '0.7rem' },
                }}
              />
            </Box>

            {/* Presets */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2.5 }}>
              <Chip
                label="All (1-5)"
                size="small"
                onClick={() => {
                  const val: [number, number] = [1, 5];
                  setLocalRatingRange(val);
                  if (onRatingRangeChange) onRatingRangeChange(val);
                }}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.06)', color: '#94A3B8' }}
              />
              <Chip
                label="4.0+ Stars"
                size="small"
                onClick={() => {
                  const val: [number, number] = [4.0, 5.0];
                  setLocalRatingRange(val);
                  if (onRatingRangeChange) onRatingRangeChange(val);
                }}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C' }}
              />
              <Chip
                label="3.0+ Stars"
                size="small"
                onClick={() => {
                  const val: [number, number] = [3.0, 5.0];
                  setLocalRatingRange(val);
                  if (onRatingRangeChange) onRatingRangeChange(val);
                }}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C' }}
              />
            </Box>
          </Popover>
        </Box>

        {/* Tag Dropdown */}
        {availableTags.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 110, flex: '1 1 110px', maxWidth: 150 }}>
            <InputLabel sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>Tag</InputLabel>
            <Select
              value={selectedTag || ''}
              label="Tag"
              onChange={(e) => onTagChange(e.target.value || undefined)}
              sx={{
                color: '#F8FAFC',
                fontSize: '0.85rem',
                backgroundColor: 'rgba(255,255,255,0.03)',
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E5A93C' },
              }}
            >
              <MenuItem value=""><em>All Tags</em></MenuItem>
              {sortedTags.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Sort Selector */}
        <FormControl size="small" sx={{ minWidth: 150, flex: '1 1 150px', maxWidth: 190, ml: 'auto' }}>
          <InputLabel sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => onSortChange(e.target.value)}
            sx={{
              color: '#F8FAFC',
              fontSize: '0.85rem',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 2,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#E5A93C' },
            }}
          >
            <MenuItem value="added_at">Recently Added</MenuItem>
            <MenuItem value="my_rating">Highest My Rated</MenuItem>
            <MenuItem value="tmdb_rating">Highest TMDB Rated</MenuItem>
            <MenuItem value="release_date">Release Date</MenuItem>
            <MenuItem value="title">Movie Title</MenuItem>
            <MenuItem value="runtime">Runtime</MenuItem>
          </Select>
        </FormControl>

        {/* Reset Button with Active Badge */}
        <Tooltip title={activeFilterCount > 0 ? `Reset ${activeFilterCount} active filters` : 'Reset filters'}>
          <IconButton
            onClick={() => {
              setSearchInput('');
              if (onSearchChange) onSearchChange('');
              setLocalYearRange([MIN_YEAR, CURRENT_YEAR]);
              setLocalRatingRange([1, 5]);
              onReset();
            }}
            sx={{
              color: activeFilterCount > 0 ? '#E5A93C' : '#64748B',
              backgroundColor: activeFilterCount > 0 ? 'rgba(229, 169, 60, 0.1)' : 'transparent',
              border: activeFilterCount > 0 ? '1px solid rgba(229, 169, 60, 0.3)' : '1px solid transparent',
              height: 38,
              width: 38,
              borderRadius: 2,
              '&:hover': { color: '#E5A93C', backgroundColor: 'rgba(229, 169, 60, 0.2)' },
            }}
          >
            <Badge badgeContent={activeFilterCount} color="warning" overlap="circular">
              <RestartAltIcon sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
