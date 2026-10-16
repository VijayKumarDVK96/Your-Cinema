import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Avatar,
  Tabs,
  Tab,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import MovieIcon from '@mui/icons-material/Movie';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import LiveTvIcon from '@mui/icons-material/LiveTv';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { UserMovie } from '../../types/index.js';

export interface PersonalityTarget {
  id?: number | null;
  name: string;
  profile_path?: string | null;
  role?: string;
}

interface PersonalityModalProps {
  open: boolean;
  onClose: () => void;
  personality: PersonalityTarget | null;
  onMovieAdded?: () => void;
}

export const PersonalityModal: React.FC<PersonalityModalProps> = ({
  open,
  onClose,
  personality,
  onMovieAdded,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'library' | 'filmography'>('library');
  const [filmographyFilter, setFilmographyFilter] = useState<'all' | 'acting' | 'directing'>('all');
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addErrors, setAddErrors] = useState<Record<number, string>>({});

  const personName = personality?.name || '';
  const personId = personality?.id || null;

  // 1. Fetch user's library movies
  const {
    data: allUserMovies = [],
    isLoading: allUserMoviesLoading,
  } = useQuery<UserMovie[]>({
    queryKey: ['my-movies', 'all-ids'],
    queryFn: async () => {
      const res = await api.get('/movies?limit=2000');
      return res.data?.data?.movies || [];
    },
    enabled: open,
    staleTime: 60000,
  });

  const existingTmdbIds = React.useMemo(() => {
    return new Set(allUserMovies.map((m) => m.tmdb_id));
  }, [allUserMovies]);

  // 3. Fetch TMDB personality credits & biography
  const {
    data: tmdbData,
    isLoading: tmdbLoading,
  } = useQuery({
    queryKey: ['personality-tmdb', personId, personName],
    queryFn: async () => {
      if (!personName && !personId) return null;
      const res = await api.get('/tmdb/person/credits', {
        params: {
          id: personId || undefined,
          name: personName || undefined,
        },
      });
      return res.data?.data || null;
    },
    enabled: open && (!!personName || !!personId),
  });

  // Reset tab selection when reopened with a different personality
  React.useEffect(() => {
    if (open) {
      setAddedIds(new Set());
      setAddErrors({});
      // If we already know the library count is 0 after first load, default can still be library or filmography
    }
  }, [open, personName]);

  const personProfile = tmdbData?.person || {};
  const photoUrl = personProfile.profile_path
    ? (personProfile.profile_path.startsWith('http')
      ? personProfile.profile_path
      : `https://image.tmdb.org/t/p/w300${personProfile.profile_path}`)
    : personality?.profile_path
    ? (personality.profile_path.startsWith('http')
      ? personality.profile_path
      : `https://image.tmdb.org/t/p/w300${personality.profile_path}`)
    : null;

  const rawCastCredits = (tmdbData?.cast || []) as any[];
  const rawCrewCredits = (tmdbData?.crew || []) as any[];

  // Authoritative Set of TMDB Movie IDs from this person's filmography
  const filmographyTmdbIds = React.useMemo(() => {
    const ids = new Set<number>();
    rawCastCredits.forEach((c) => { if (c.id) ids.add(c.id); });
    rawCrewCredits.forEach((c) => { if (c.id) ids.add(c.id); });
    return ids;
  }, [rawCastCredits, rawCrewCredits]);

  const normalizedPersonName = personName.trim().toLowerCase();

  // Exactly matched movies in user's library
  const libraryMovies = React.useMemo(() => {
    if (!normalizedPersonName && !personId) return [];

    return allUserMovies.filter((movie: UserMovie) => {
      // 1. Definite match: movie's TMDB ID is in this person's TMDB filmography
      if (movie.tmdb_id && filmographyTmdbIds.has(movie.tmdb_id)) {
        return true;
      }

      // 2. Exact match by TMDB Person ID in cast or crew
      if (personId) {
        if (movie.cast_members?.some((c: any) => c.id === personId)) return true;
        if (movie.crew_members?.some((c: any) => c.id === personId)) return true;
        if (movie.created_by?.some((c: any) => c.id === personId)) return true;
      }

      // 3. Exact match by name (strict equality, NOT loose substring)
      if (normalizedPersonName) {
        if (movie.director && movie.director.trim().toLowerCase() === normalizedPersonName) {
          return true;
        }
        if (movie.cast_members?.some((c: any) => c.name?.trim().toLowerCase() === normalizedPersonName)) {
          return true;
        }
        if (movie.crew_members?.some((c: any) => c.name?.trim().toLowerCase() === normalizedPersonName)) {
          return true;
        }
        if (movie.created_by?.some((c: any) => c.name?.trim().toLowerCase() === normalizedPersonName)) {
          return true;
        }
      }

      return false;
    });
  }, [allUserMovies, filmographyTmdbIds, personId, normalizedPersonName]);

  const libraryLoading = allUserMoviesLoading || tmdbLoading;

  // Filter filmography
  const filteredCredits = React.useMemo(() => {
    if (filmographyFilter === 'acting') {
      return rawCastCredits;
    }
    if (filmographyFilter === 'directing') {
      return rawCrewCredits;
    }
    // Combine and deduplicate
    const map = new Map<number, any>();
    rawCastCredits.forEach((c) => map.set(c.id, { ...c, roleType: 'cast' }));
    rawCrewCredits.forEach((c) => {
      if (!map.has(c.id)) {
        map.set(c.id, { ...c, roleType: 'crew' });
      }
    });
    return Array.from(map.values());
  }, [rawCastCredits, rawCrewCredits, filmographyFilter]);

  // Quick 1-click add mutation
  const addMovieMutation = useMutation({
    mutationFn: async (creditItem: any) => {
      const type = creditItem.media_type === 'tv' ? 'tv' : 'movie';
      await api.post('/movies', {
        tmdb_id: creditItem.id,
        media_type: type,
        watch_status: 'plan_to_watch',
      });
      return creditItem.id;
    },
    onSuccess: (addedTmdbId) => {
      setAddedIds((prev) => new Set(prev).add(addedTmdbId));
      queryClient.invalidateQueries({ queryKey: ['personality-library'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
      if (onMovieAdded) onMovieAdded();
    },
    onError: (err: any, creditItem: any) => {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to add movie.';
      setAddErrors((prev) => ({ ...prev, [creditItem.id]: msg }));
    },
    onSettled: () => {
      setAddingId(null);
    },
  });

  const handleQuickAdd = (creditItem: any) => {
    setAddingId(creditItem.id);
    addMovieMutation.mutate(creditItem);
  };

  const handleNavigateToMovie = (userMovieId: string | number) => {
    onClose();
    navigate(`/movies/${userMovieId}`);
  };

  const handleOpenLibrarySearch = () => {
    onClose();
    if (personId) {
      navigate(`/movies?person_id=${personId}&search=${encodeURIComponent(personName)}`);
    } else {
      navigate(`/movies?person_name=${encodeURIComponent(personName)}`);
    }
  };

  if (!open || !personality) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#07090E',
          backgroundImage: 'radial-gradient(ellipse at top, rgba(30, 41, 59, 0.45) 0%, #07090E 75%)',
          border: '1px solid rgba(229, 169, 60, 0.25)',
          borderRadius: 3.5,
          maxHeight: '90vh',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.95), 0 0 35px -10px rgba(229, 169, 60, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Dialog Header: Person Profile Banner */}
      <DialogTitle
        sx={{
          p: { xs: 2, sm: 3 },
          pb: 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          position: 'relative',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
            {photoUrl ? (
              <Avatar
                src={photoUrl}
                alt={personName}
                sx={{
                  width: { xs: 64, sm: 76 },
                  height: { xs: 64, sm: 76 },
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  border: '2px solid rgba(229, 169, 60, 0.6)',
                }}
              />
            ) : (
              <Avatar
                sx={{
                  width: { xs: 64, sm: 76 },
                  height: { xs: 64, sm: 76 },
                  backgroundColor: 'rgba(229, 169, 60, 0.15)',
                  color: '#E5A93C',
                  fontWeight: 800,
                  fontSize: '1.8rem',
                  border: '2px solid rgba(229, 169, 60, 0.4)',
                }}
              >
                {personName.charAt(0)}
              </Avatar>
            )}

            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
                <Typography variant="h5" sx={{ color: '#F8FAFC', fontWeight: 800, lineHeight: 1.2 }}>
                  {personName}
                </Typography>
                {personality.role && (
                  <Chip
                    label={personality.role}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(229, 169, 60, 0.15)',
                      color: '#E5A93C',
                      fontWeight: 700,
                      border: '1px solid rgba(229, 169, 60, 0.3)',
                      height: 22,
                    }}
                  />
                )}
              </Box>

              <Typography variant="caption" sx={{ color: '#94A3B8', mt: 0.5, display: 'block' }}>
                {personProfile.known_for_department
                  ? `Known for ${personProfile.known_for_department}`
                  : 'Actor / Filmmaker'}
                {personProfile.place_of_birth ? ` • Born in ${personProfile.place_of_birth}` : ''}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="View full personality search in My Movies">
              <Button
                size="small"
                variant="outlined"
                startIcon={<SearchIcon />}
                onClick={handleOpenLibrarySearch}
                sx={{
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#CBD5E1',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  display: { xs: 'none', sm: 'inline-flex' },
                  '&:hover': {
                    borderColor: '#E5A93C',
                    color: '#E5A93C',
                    backgroundColor: 'rgba(229, 169, 60, 0.08)',
                  },
                }}
              >
                Search in Library
              </Button>
            </Tooltip>
            <IconButton onClick={onClose} sx={{ color: '#94A3B8', '&:hover': { color: '#F8FAFC' } }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {personProfile.biography && (
          <Typography
            variant="body2"
            sx={{
              color: '#94A3B8',
              mt: 1.5,
              fontSize: '0.82rem',
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {personProfile.biography}
          </Typography>
        )}
      </DialogTitle>

      {/* Tabs Switcher: In Library vs TMDB Filmography */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 1.5, backgroundColor: '#090D16', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          textColor="inherit"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: '#E5A93C',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTab-root': {
              color: '#94A3B8',
              fontWeight: 700,
              fontSize: '0.88rem',
              textTransform: 'none',
              minHeight: 44,
              px: 2,
              '&.Mui-selected': {
                color: '#F8FAFC',
              },
            },
          }}
        >
          <Tab
            value="library"
            icon={<VideoLibraryIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>In Your Library</span>
                <Chip
                  label={libraryLoading ? '...' : libraryMovies.length}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    backgroundColor: activeTab === 'library' ? '#E5A93C' : 'rgba(255, 255, 255, 0.1)',
                    color: activeTab === 'library' ? '#07090E' : '#94A3B8',
                  }}
                />
              </Box>
            }
          />
          <Tab
            value="filmography"
            icon={<MovieIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>Filmography (TMDB)</span>
                <Chip
                  label={tmdbLoading ? '...' : (rawCastCredits.length + rawCrewCredits.length)}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    backgroundColor: activeTab === 'filmography' ? '#38BDF8' : 'rgba(255, 255, 255, 0.1)',
                    color: activeTab === 'filmography' ? '#07090E' : '#94A3B8',
                  }}
                />
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Dialog Body */}
      <DialogContent sx={{ p: { xs: 2, sm: 3 }, overflowY: 'auto' }}>
        {/* ================= TAB 1: IN YOUR LIBRARY ================= */}
        {activeTab === 'library' && (
          <Box>
            {libraryLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
                <CircularProgress size={32} sx={{ color: '#E5A93C' }} />
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                  Scanning your sanctuary for titles featuring {personName}...
                </Typography>
              </Box>
            ) : libraryMovies.length > 0 ? (
              <Grid container spacing={2}>
                {libraryMovies.map((m) => {
                  const mPoster = m.custom_poster_url || (m.poster_path ? `https://image.tmdb.org/t/p/w300${m.poster_path}` : null);
                  return (
                    <Grid item xs={6} sm={4} md={3} key={m.user_movie_id}>
                      <Paper
                        elevation={0}
                        onClick={() => handleNavigateToMovie(m.user_movie_id)}
                        sx={{
                          borderRadius: 2.5,
                          overflow: 'hidden',
                          backgroundColor: '#0F172A',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          cursor: 'pointer',
                          transition: 'all 0.25s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            borderColor: '#E5A93C',
                            boxShadow: '0 12px 28px -8px rgba(0,0,0,0.8), 0 0 0 1px rgba(229, 169, 60, 0.4)',
                            '& .card-poster': { transform: 'scale(1.05)' },
                          },
                        }}
                      >
                        <Box sx={{ position: 'relative', width: '100%', pt: '148%', backgroundColor: '#1E293B', overflow: 'hidden' }}>
                          {mPoster ? (
                            <Box
                              component="img"
                              className="card-poster"
                              src={mPoster}
                              alt={m.title}
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transition: 'transform 0.3s ease',
                              }}
                            />
                          ) : (
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                              <MovieIcon sx={{ fontSize: 36 }} />
                            </Box>
                          )}

                          {m.media_type === 'tv' && (
                            <Chip
                              icon={<LiveTvIcon sx={{ fontSize: '11px !important', color: '#fff !important' }} />}
                              label="SERIES"
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                height: 18,
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                backgroundColor: 'rgba(124, 58, 237, 0.85)',
                                color: '#fff',
                              }}
                            />
                          )}

                          {m.personal_rating != null && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.3,
                                px: 0.8,
                                py: 0.3,
                                borderRadius: 1.5,
                                backgroundColor: 'rgba(7, 9, 14, 0.85)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(229, 169, 60, 0.5)',
                              }}
                            >
                              <StarIcon sx={{ color: '#E5A93C', fontSize: 13 }} />
                              <Typography variant="caption" sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: '0.72rem' }}>
                                {Number(m.personal_rating).toFixed(1)}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        <Box sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              color: '#F8FAFC',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              lineHeight: 1.25,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              mb: 0.5,
                            }}
                          >
                            {m.title}
                          </Typography>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                              {m.release_date ? m.release_date.substring(0, 4) : 'TBD'}
                            </Typography>
                            <Chip
                              label="In Sanctuary"
                              size="small"
                              sx={{
                                height: 18,
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            />
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                <VideoLibraryIcon sx={{ fontSize: 54, color: '#334155', mb: 1.5 }} />
                <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 0.5 }}>
                  No Titles in Your Sanctuary Yet
                </Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8', maxWidth: 440, mx: 'auto', mb: 3 }}>
                  You don't currently have any titles featuring <strong>{personName}</strong> saved in your personal library.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<MovieIcon />}
                  onClick={() => setActiveTab('filmography')}
                  sx={{
                    backgroundColor: '#E5A93C',
                    color: '#07090E',
                    fontWeight: 700,
                    textTransform: 'none',
                    px: 3,
                    borderRadius: 2,
                    '&:hover': { backgroundColor: '#D4982B' },
                  }}
                >
                  Explore TMDB Filmography ({rawCastCredits.length + rawCrewCredits.length})
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* ================= TAB 2: TMDB FILMOGRAPHY ================= */}
        {activeTab === 'filmography' && (
          <Box>
            {/* Filter sub-chips */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={`All Credits (${rawCastCredits.length + rawCrewCredits.length})`}
                  onClick={() => setFilmographyFilter('all')}
                  sx={{
                    backgroundColor: filmographyFilter === 'all' ? '#38BDF8' : 'rgba(255, 255, 255, 0.05)',
                    color: filmographyFilter === 'all' ? '#07090E' : '#94A3B8',
                    fontWeight: 700,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: filmographyFilter === 'all' ? '#0284C7' : 'rgba(255, 255, 255, 0.1)' },
                  }}
                />
                {rawCastCredits.length > 0 && (
                  <Chip
                    label={`Cast / Acting (${rawCastCredits.length})`}
                    onClick={() => setFilmographyFilter('acting')}
                    sx={{
                      backgroundColor: filmographyFilter === 'acting' ? '#E5A93C' : 'rgba(255, 255, 255, 0.05)',
                      color: filmographyFilter === 'acting' ? '#07090E' : '#94A3B8',
                      fontWeight: 700,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: filmographyFilter === 'acting' ? '#D4982B' : 'rgba(255, 255, 255, 0.1)' },
                    }}
                  />
                )}
                {rawCrewCredits.length > 0 && (
                  <Chip
                    label={`Directing & Crew (${rawCrewCredits.length})`}
                    onClick={() => setFilmographyFilter('directing')}
                    sx={{
                      backgroundColor: filmographyFilter === 'directing' ? '#A855F7' : 'rgba(255, 255, 255, 0.05)',
                      color: filmographyFilter === 'directing' ? '#07090E' : '#94A3B8',
                      fontWeight: 700,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: filmographyFilter === 'directing' ? '#9333EA' : 'rgba(255, 255, 255, 0.1)' },
                    }}
                  />
                )}
              </Box>

              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Sorted by TMDB popularity & relevance
              </Typography>
            </Box>

            {tmdbLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
                <CircularProgress size={32} sx={{ color: '#38BDF8' }} />
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                  Retrieving complete filmography from TMDB...
                </Typography>
              </Box>
            ) : filteredCredits.length > 0 ? (
              <Grid container spacing={2}>
                {filteredCredits.map((item) => {
                  const isInLibrary = existingTmdbIds.has(item.id) || addedIds.has(item.id);
                  const isAdding = addingId === item.id;
                  const itemErr = addErrors[item.id];
                  const itemPoster = item.poster_path
                    ? (item.poster_path.startsWith('http') ? item.poster_path : `https://image.tmdb.org/t/p/w300${item.poster_path}`)
                    : null;
                  const roleLabel = item.character ? `as ${item.character}` : item.job || '';

                  return (
                    <Grid item xs={6} sm={4} md={3} key={`${item.id}-${item.character || item.job || 'item'}`}>
                      <Paper
                        elevation={0}
                        sx={{
                          borderRadius: 2.5,
                          overflow: 'hidden',
                          backgroundColor: '#0F172A',
                          border: isInLibrary ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'all 0.25s ease',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            borderColor: isInLibrary ? '#10B981' : 'rgba(56, 189, 248, 0.5)',
                            boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.8)',
                          },
                        }}
                      >
                        <Box sx={{ position: 'relative', width: '100%', pt: '148%', backgroundColor: '#1E293B', overflow: 'hidden' }}>
                          {itemPoster ? (
                            <Box
                              component="img"
                              src={itemPoster}
                              alt={item.title}
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          ) : (
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                              <MovieIcon sx={{ fontSize: 36 }} />
                            </Box>
                          )}

                          {item.media_type === 'tv' && (
                            <Chip
                              icon={<LiveTvIcon sx={{ fontSize: '11px !important', color: '#fff !important' }} />}
                              label="SERIES"
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                height: 18,
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                backgroundColor: 'rgba(124, 58, 237, 0.85)',
                                color: '#fff',
                              }}
                            />
                          )}

                          {item.vote_average > 0 && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.3,
                                px: 0.8,
                                py: 0.3,
                                borderRadius: 1.5,
                                backgroundColor: 'rgba(7, 9, 14, 0.85)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                              }}
                            >
                              <StarIcon sx={{ color: '#E5A93C', fontSize: 13 }} />
                              <Typography variant="caption" sx={{ color: '#F8FAFC', fontWeight: 800, fontSize: '0.72rem' }}>
                                {Number(item.vote_average).toFixed(1)}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        <Box sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <Box sx={{ mb: 1 }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                color: '#F8FAFC',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                lineHeight: 1.25,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {item.title}
                            </Typography>
                            {roleLabel && (
                              <Typography
                                variant="caption"
                                sx={{
                                  color: '#38BDF8',
                                  fontSize: '0.72rem',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  mt: 0.3,
                                }}
                              >
                                {roleLabel}
                              </Typography>
                            )}
                            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.3 }}>
                              {item.release_date ? item.release_date.substring(0, 4) : 'TBD'}
                            </Typography>
                          </Box>

                          {itemErr && (
                            <Typography variant="caption" sx={{ color: '#EF4444', display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
                              {itemErr}
                            </Typography>
                          )}

                          {isInLibrary ? (
                            <Button
                              fullWidth
                              size="small"
                              variant="outlined"
                              startIcon={<CheckCircleIcon sx={{ color: '#10B981' }} />}
                              onClick={() => {
                                const matched = allUserMovies.find((um) => um.tmdb_id === item.id);
                                if (matched) {
                                  handleNavigateToMovie(matched.user_movie_id);
                                }
                              }}
                              sx={{
                                borderColor: 'rgba(16, 185, 129, 0.4)',
                                color: '#10B981',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'none',
                                py: 0.4,
                                '&:hover': {
                                  borderColor: '#10B981',
                                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                },
                              }}
                            >
                              In Library
                            </Button>
                          ) : (
                            <Button
                              fullWidth
                              size="small"
                              variant="contained"
                              disabled={isAdding}
                              startIcon={isAdding ? <CircularProgress size={12} sx={{ color: '#07090E' }} /> : <AddIcon />}
                              onClick={() => handleQuickAdd(item)}
                              sx={{
                                backgroundColor: '#E5A93C',
                                color: '#07090E',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                textTransform: 'none',
                                py: 0.4,
                                '&:hover': {
                                  backgroundColor: '#D4982B',
                                },
                                '&:disabled': {
                                  backgroundColor: 'rgba(229, 169, 60, 0.4)',
                                  color: '#07090E',
                                },
                              }}
                            >
                              {isAdding ? 'Adding...' : 'Add to Library'}
                            </Button>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <MovieIcon sx={{ fontSize: 48, color: '#334155', mb: 1 }} />
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                  No filmography credits returned from TMDB for this person.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
