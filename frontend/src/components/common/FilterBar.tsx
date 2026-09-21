import React, { useState } from 'react';
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
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ListSubheader from '@mui/material/ListSubheader';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { Tag, Genre } from '../../types/index.js';

interface FilterBarProps {
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
  isFavorite?: boolean;
  onFavoriteToggle: () => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  availableTags: Tag[];
  availableGenres?: { predefined: Genre[]; custom: Genre[]; all: Genre[] } | Genre[];
  onReset: () => void;
}

const OTT_OPTIONS = [
  { value: 'Netflix', label: 'Netflix', color: '#E50914' },
  { value: 'Amazon Prime Video', label: 'Prime Video', color: '#00A8E1' },
  { value: 'Disney+ Hotstar', label: 'Disney+ Hotstar', color: '#113CCF' },
  { value: 'Sun NXT', label: 'Sun NXT', color: '#FF6B00' },
  { value: 'Apple TV+', label: 'Apple TV+', color: '#A3AAAE' },
  { value: 'YouTube', label: 'YouTube', color: '#FF0000' },
  { value: 'Google Drive', label: 'Google Drive', color: '#34A853' },
  { value: 'JioCinema', label: 'JioCinema', color: '#D80075' },
  { value: 'Zee5', label: 'Zee5', color: '#8230C6' },
  { value: 'Sony LIV', label: 'Sony LIV', color: '#00E5FF' },
  { value: 'Aha', label: 'Aha', color: '#FF5000' },
  { value: 'Vi Movies & TV', label: 'Vi Movies & TV', color: '#E40046' },
  { value: 'any_ott', label: 'Any Streaming / OTT', color: '#E5A93C' },
];

const GENRE_OPTIONS = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
  { id: 27, name: 'Horror' },
  { id: 9648, name: 'Mystery' },
];

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'Tamil' },
  { code: 'hi', name: 'Hindi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ko', name: 'Korean' },
];

export const FilterBar: React.FC<FilterBarProps> = ({
  status,
  onStatusChange,
  selectedGenre,
  onGenreChange,
  selectedOtt,
  onOttChange,
  selectedMediaType = 'all',
  onMediaTypeChange,
  selectedLanguage,
  onLanguageChange,
  selectedTag,
  onTagChange,
  ratingRange = [1, 5],
  onRatingRangeChange,
  isFavorite,
  onFavoriteToggle,
  sortBy,
  onSortChange,
  availableTags,
  availableGenres,
  onReset,
}) => {
  const [ratingAnchorEl, setRatingAnchorEl] = useState<null | HTMLElement>(null);
  const customGenresList: Genre[] = Array.isArray(availableGenres)
    ? availableGenres.filter(g => !g.is_predefined)
    : (availableGenres?.custom || []);

  const predefinedGenresList: Genre[] = Array.isArray(availableGenres)
    ? availableGenres.filter(g => g.is_predefined)
    : (availableGenres?.predefined?.length
        ? availableGenres.predefined
        : GENRE_OPTIONS.map(g => ({ id: g.id, tmdb_id: g.id, name: g.name, is_predefined: true })));
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.5,
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        backgroundColor: '#0C101A',
        borderRadius: 2.5,
        border: '1px solid rgba(255, 255, 255, 0.06)',
        mb: 3,
      }}
    >
      {/* Left side: Media type & Status toggles */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        {onMediaTypeChange && (
          <ToggleButtonGroup
            value={selectedMediaType}
            exclusive
            onChange={(_, val) => val && onMediaTypeChange(val)}
            size="small"
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 2,
              '& .MuiToggleButton-root': {
                color: '#94A3B8',
                border: 'none',
                px: 1.75,
                fontWeight: 600,
                fontSize: '0.8rem',
                textTransform: 'none',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(168, 85, 247, 0.25)',
                  color: '#F8FAFC',
                  fontWeight: 700,
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  '&:hover': {
                    backgroundColor: 'rgba(168, 85, 247, 0.35)',
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
        <ToggleButtonGroup
          value={status}
          exclusive
          onChange={(_, val) => val && onStatusChange(val)}
          size="small"
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 2,
            '& .MuiToggleButton-root': {
              color: '#94A3B8',
              border: 'none',
              px: 2,
              fontWeight: 600,
              fontSize: '0.8rem',
              '&.Mui-selected': {
                backgroundColor: '#E5A93C',
                color: '#000',
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

        {/* Favorite filter toggle */}
        <Tooltip title={isFavorite ? 'Showing Favorites Only' : 'Filter Favorites'}>
          <IconButton
            onClick={onFavoriteToggle}
            sx={{
              backgroundColor: isFavorite ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              color: isFavorite ? '#EF4444' : '#64748B',
              '&:hover': { color: '#EF4444' },
            }}
          >
            {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Right side: Dropdown filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        {/* Genre dropdown */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel sx={{ color: '#94A3B8' }}>Genre</InputLabel>
          <Select
            value={selectedGenre !== undefined && selectedGenre !== null ? String(selectedGenre) : ''}
            label="Genre"
            onChange={(e) => {
              const val = e.target.value;
              onGenreChange(val ? val : undefined);
            }}
            sx={{ color: '#F8FAFC', backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <MenuItem value=""><em>All Genres</em></MenuItem>

            {customGenresList.length > 0 && (
              <ListSubheader
                sx={{
                  backgroundColor: '#0F172A',
                  color: '#38BDF8',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                  lineHeight: '32px',
                }}
              >
                ✨ CUSTOM GENRES
              </ListSubheader>
            )}
            {customGenresList.map((g) => (
              <MenuItem key={g.id} value={String(g.id)}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: g.color || '#38BDF8',
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#F8FAFC' }}>
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

            <ListSubheader
              sx={{
                backgroundColor: '#0F172A',
                color: '#E5A93C',
                fontWeight: 700,
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                lineHeight: '32px',
              }}
            >
              PREDEFINED GENRES
            </ListSubheader>
            {predefinedGenresList.map((g) => (
              <MenuItem key={g.id} value={String(g.tmdb_id || g.id)}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: g.color || '#E5A93C',
                    }}
                  />
                  <span>{g.name}</span>
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

        {/* Language dropdown */}
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel sx={{ color: '#94A3B8' }}>Language</InputLabel>
          <Select
            value={selectedLanguage || ''}
            label="Language"
            onChange={(e) => onLanguageChange(e.target.value || undefined)}
            sx={{ color: '#F8FAFC', backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <MenuItem value=""><em>All Languages</em></MenuItem>
            {LANGUAGE_OPTIONS.map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>{lang.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* OTT / Streaming Platform dropdown */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel sx={{ color: '#94A3B8' }}>OTT Platform</InputLabel>
          <Select
            value={selectedOtt || ''}
            label="OTT Platform"
            onChange={(e) => onOttChange(e.target.value || undefined)}
            sx={{ color: '#F8FAFC', backgroundColor: 'rgba(255,255,255,0.03)' }}
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

        {/* Tag dropdown */}
        {availableTags.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel sx={{ color: '#94A3B8' }}>Tag</InputLabel>
            <Select
              value={selectedTag || ''}
              label="Tag"
              onChange={(e) => onTagChange(e.target.value || undefined)}
              sx={{ color: '#F8FAFC', backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <MenuItem value=""><em>All Tags</em></MenuItem>
              {availableTags.map((t) => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* My Rating Slider Filter */}
        <Box>
          <Button
            size="small"
            onClick={(e) => setRatingAnchorEl(e.currentTarget)}
            sx={{
              height: 40,
              px: 2,
              color: (ratingRange[0] > 1 || ratingRange[1] < 5) ? '#E5A93C' : '#F8FAFC',
              backgroundColor: (ratingRange[0] > 1 || ratingRange[1] < 5) ? 'rgba(229, 169, 60, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              border: (ratingRange[0] > 1 || ratingRange[1] < 5) ? '1px solid #E5A93C' : '1px solid rgba(255, 255, 255, 0.23)',
              borderRadius: '4px',
              textTransform: 'none',
              fontSize: '0.85rem',
              fontWeight: (ratingRange[0] > 1 || ratingRange[1] < 5) ? 700 : 500,
              '&:hover': {
                backgroundColor: (ratingRange[0] > 1 || ratingRange[1] < 5) ? 'rgba(229, 169, 60, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                borderColor: (ratingRange[0] > 1 || ratingRange[1] < 5) ? '#E5A93C' : '#F8FAFC',
              },
            }}
          >
            <StarIcon sx={{ fontSize: 16, mr: 0.8, color: '#E5A93C' }} />
            {(ratingRange[0] > 1 || ratingRange[1] < 5) ? `⭐ ${ratingRange[0].toFixed(1)} – ${ratingRange[1].toFixed(1)}` : 'My Rating'}
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
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2.5,
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                Filter Rating Range
              </Typography>
              <Chip
                label={`⭐ ${ratingRange[0].toFixed(1)} to ${ratingRange[1].toFixed(1)}`}
                size="small"
                sx={{ backgroundColor: '#E5A93C', color: '#000', fontWeight: 700, fontSize: '0.72rem' }}
              />
            </Box>

            <Box sx={{ px: 1, py: 1 }}>
              <Slider
                value={ratingRange}
                onChange={(_, val) => onRatingRangeChange && onRatingRangeChange(val as [number, number])}
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
                onClick={() => onRatingRangeChange && onRatingRangeChange([1, 5])}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.06)', color: '#94A3B8' }}
              />
              <Chip
                label="4.0+ Stars"
                size="small"
                onClick={() => onRatingRangeChange && onRatingRangeChange([4.0, 5.0])}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C' }}
              />
              <Chip
                label="3.0+ Stars"
                size="small"
                onClick={() => onRatingRangeChange && onRatingRangeChange([3.0, 5.0])}
                sx={{ cursor: 'pointer', backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C' }}
              />
            </Box>
          </Popover>
        </Box>

        {/* Sort selector */}
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel sx={{ color: '#94A3B8' }}>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => onSortChange(e.target.value)}
            sx={{ color: '#F8FAFC', backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <MenuItem value="added_at">Recently Added</MenuItem>
            <MenuItem value="my_rating">Highest My Rated</MenuItem>
            <MenuItem value="tmdb_rating">Highest TMDB Rated</MenuItem>
            <MenuItem value="release_date">Release Date</MenuItem>
            <MenuItem value="title">Movie Title</MenuItem>
            <MenuItem value="runtime">Runtime</MenuItem>
          </Select>
        </FormControl>

        {/* Reset button */}
        <Tooltip title="Reset all filters">
          <IconButton onClick={onReset} sx={{ color: '#94A3B8', '&:hover': { color: '#E5A93C' } }}>
            <RestartAltIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
