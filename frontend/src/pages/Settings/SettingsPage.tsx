import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DisplaySettingsIcon from '@mui/icons-material/DisplaySettings';
import BackupIcon from '@mui/icons-material/Backup';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext.js';
import { useTVNavigation } from '../../context/TVNavigationContext.js';
import { api } from '../../api/client.js';
import { ImportProgressModal, ImportProgressState } from '../../components/common/ImportProgressModal.js';
import {
  AccountSecurityTab,
  AiSettingsTab,
  TvDisplayTab,
  CustomGenresTab,
  BackupRestoreTab,
  DangerZoneTab,
  CustomGenreModals,
} from './components/index.js';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { isTvMode, toggleTvMode } = useTVNavigation();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isDesktopTabs = useMediaQuery(theme.breakpoints.up('lg'));

  // Progressive Import Progress & Cancellation State
  const cancelImportRef = useRef<boolean>(false);
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    isOpen: false,
    title: 'Restoring Sanctuary Backup...',
    subtitle: 'Importing movies, custom posters, watchlists & tags',
    stage: 'Starting restore...',
    currentTitle: '',
    currentPoster: null,
    current: 0,
    total: 0,
    status: 'idle',
  });

  // Active Horizontal Tab: 'account' | 'ai' | 'display' | 'genres' | 'backup' | 'danger'
  const [activeTab, setActiveTab] = useState<string>('account');

  // Custom Genres Management State
  const [addGenreOpen, setAddGenreOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<any | null>(null);
  const [genreToDelete, setGenreToDelete] = useState<{ id: string; name: string } | null>(null);
  const [genreErrorMsg, setGenreErrorMsg] = useState<string | null>(null);

  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return res.data?.data;
    },
  });

  const createGenreMutation = useMutation({
    mutationFn: async (data: { name: string; color?: string; description?: string }) => {
      await api.post('/genres', data);
    },
    onSuccess: () => {
      setAddGenreOpen(false);
      setGenreErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
    onError: (err: any) => {
      setGenreErrorMsg(err.response?.data?.error?.message || err.message || 'Failed to create custom genre');
    },
  });

  const updateGenreMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; color?: string; description?: string } }) => {
      await api.patch(`/genres/${id}`, data);
    },
    onSuccess: () => {
      setEditingGenre(null);
      setGenreErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
    onError: (err: any) => {
      setGenreErrorMsg(err.response?.data?.error?.message || err.message || 'Failed to update custom genre');
    },
  });

  const deleteGenreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/genres/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  // Library Reset State
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState<string | null>(null);

  // Export / Import State
  const [exportLoading, setExportLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [runtimeMin, setRuntimeMin] = useState(user?.preferred_runtime_min || 60);
  const [runtimeMax, setRuntimeMax] = useState(user?.preferred_runtime_max || 180);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Change Password State
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI Settings State
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiModel, setAiModel] = useState('gemini-3.5-flash');
  const [aiConfigured, setAiConfigured] = useState({ gemini: false, openrouter: false });
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<any | null>(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRuntimeMin(user.preferred_runtime_min || 60);
      setRuntimeMax(user.preferred_runtime_max || 180);
    }
  }, [user]);

  useEffect(() => {
    api.get('/ai/settings').then((res) => {
      const data = res.data?.data;
      if (data) {
        setAiProvider(data.provider || 'gemini');
        setAiModel(data.model_name || 'gemini-1.5-flash');
        setAiConfigured({
          gemini: !!data.is_gemini_configured,
          openrouter: !!data.is_openrouter_configured,
        });
      }
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await api.patch('/auth/profile', {
        name,
        preferred_runtime_min: Number(runtimeMin),
        preferred_runtime_max: Number(runtimeMax),
      });
      await refreshProfile();
      setProfileMsg('Profile preferences updated.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (current: string, newPw: string, confirm: string) => {
    setPwMsg(null);
    if (newPw !== confirm) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    setPwSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: current, newPassword: newPw });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.response?.data?.error?.message || err.message || 'Failed to change password.' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleTestAi = async () => {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      const res = await api.post('/ai/test');
      setAiTestResult(res.data?.data);
    } catch (err: any) {
      setAiTestResult({ success: false, message: err.message });
    } finally {
      setAiTesting(false);
    }
  };

  const handleSaveAi = async () => {
    setAiSaving(true);
    setAiSuccessMsg(null);
    try {
      await api.post('/ai/settings', {
        provider: aiProvider,
        model_name: aiModel,
      });
      setAiSuccessMsg(`Active AI set to ${aiProvider === 'gemini' ? 'Google Gemini' : 'OpenRouter'} (${aiModel})`);
    } catch (err: any) {
      alert(err.message || 'Failed to update AI provider/model.');
    } finally {
      setAiSaving(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const [moviesRes, watchlistsRes, genresRes, tagsRes] = await Promise.all([
        api.get('/movies?limit=9999'),
        api.get('/watchlists?limit=1000'),
        api.get('/genres'),
        api.get('/tags'),
      ]);

      const rawMovies = moviesRes.data?.data?.movies || [];
      const exportedMovies = rawMovies.map((m: any) => ({
        id: m.id,
        movie_id: m.movie_id,
        user_movie_id: m.user_movie_id,
        tmdb_id: m.tmdb_id,
        media_type: m.media_type || 'movie',
        title: m.title,
        original_title: m.original_title,
        release_date: m.release_date,
        original_language: m.original_language,
        custom_title: m.custom_title || null,
        custom_overview: m.custom_overview || null,
        custom_poster_url: m.custom_poster_url || (m.poster_path?.startsWith('http') ? m.poster_path : null),
        custom_backdrop_url: m.custom_backdrop_url || (m.backdrop_path?.startsWith('http') ? m.backdrop_path : null),
        custom_runtime: m.custom_runtime || null,
        custom_director: m.custom_director || null,
        is_customized: Boolean(m.is_customized || m.custom_poster_url || m.custom_backdrop_url || m.custom_title || m.custom_director),
        assigned_genre: m.assigned_genre || null,
        excluded_genres: Array.isArray(m.excluded_genres) ? m.excluded_genres : [],
        watch_status: m.watch_status || 'unwatched',
        personal_rating: m.personal_rating ?? null,
        is_favorite: Boolean(m.is_favorite),
        personal_notes: m.personal_notes || null,
        current_season: m.current_season || 1,
        current_episode: m.current_episode || 1,
        playback_position_sec: m.playback_position_sec || 0,
        trailer_url: m.trailer_url || null,
        sources: Array.isArray(m.sources) ? m.sources : [],
        custom_genres: Array.isArray(m.custom_genres) ? m.custom_genres : (m.custom_genre ? [m.custom_genre] : []),
        tags: Array.isArray(m.tags) ? m.tags : [],
        watchlists: Array.isArray(m.watchlists) ? m.watchlists : [],
      }));

      const rawWatchlists = Array.isArray(watchlistsRes.data?.data)
        ? watchlistsRes.data?.data
        : (watchlistsRes.data?.data?.watchlists || []);

      const payload = {
        exportedAt: new Date().toISOString(),
        version: '2.0',
        userPreferences: {
          preferred_runtime_min: user?.preferred_runtime_min,
          preferred_runtime_max: user?.preferred_runtime_max,
        },
        movies: exportedMovies,
        watchlists: rawWatchlists,
        customGenres: genresRes.data?.data?.custom || [],
        tags: tagsRes.data?.data || [],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `your-cinema-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Export failed.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportMsg(null);
    cancelImportRef.current = false;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload.version || !Array.isArray(payload.movies)) {
        throw new Error('Invalid backup file format. Please use a file exported from Your Cinema.');
      }

      const totalMovies = payload.movies.length;
      setImportProgress({
        isOpen: true,
        title: 'Restoring Sanctuary Backup...',
        subtitle: `Restoring ${totalMovies} titles with custom metadata, posters, OTT links & watchlists`,
        stage: 'Setting up custom genres, tags, and watchlists...',
        currentTitle: 'Initializing database structures...',
        currentPoster: null,
        current: 0,
        total: totalMovies,
        status: 'running',
      });

      const genreIdMap: Record<string, string> = {};
      const genreNameMap: Record<string, string> = {};
      for (const cg of (payload.customGenres || [])) {
        if (cancelImportRef.current) break;
        try {
          const res = await api.post('/genres', { name: cg.name, color: cg.color, description: cg.description });
          if (res.data?.data?.id) {
            genreIdMap[cg.id] = res.data.data.id;
            genreNameMap[cg.name.toLowerCase()] = res.data.data.id;
          }
        } catch {
          try {
            const list = await api.get('/genres');
            const found = (list.data?.data?.custom || []).find((x: any) => x.name.toLowerCase() === (cg.name || '').toLowerCase());
            if (found) {
              genreIdMap[cg.id] = found.id;
              genreNameMap[cg.name.toLowerCase()] = found.id;
            }
          } catch {}
        }
      }

      const tagIdMap: Record<string, string> = {};
      const tagNameMap: Record<string, string> = {};
      for (const tag of (payload.tags || [])) {
        if (cancelImportRef.current) break;
        try {
          const res = await api.post('/tags', { name: tag.name, color: tag.color });
          if (res.data?.data?.id) {
            tagIdMap[tag.id] = res.data.data.id;
            tagNameMap[tag.name.toLowerCase()] = res.data.data.id;
          }
        } catch {
          try {
            const list = await api.get('/tags');
            const found = (list.data?.data || []).find((t: any) => t.name.toLowerCase() === (tag.name || '').toLowerCase());
            if (found) {
              tagIdMap[tag.id] = found.id;
              tagNameMap[tag.name.toLowerCase()] = found.id;
            }
          } catch {}
        }
      }

      const watchlistIdMap: Record<string, string> = {};
      for (const wl of (payload.watchlists || [])) {
        if (cancelImportRef.current) break;
        try {
          const res = await api.post('/watchlists', {
            name: wl.name,
            description: wl.description,
            cover_image_url: wl.cover_image_url,
          });
          if (res.data?.data?.id) {
            watchlistIdMap[wl.id] = res.data.data.id;
          }
        } catch {
          try {
            const list = await api.get('/watchlists?limit=1000');
            const found = (list.data?.data?.watchlists || list.data?.data || []).find((w: any) => w.name.toLowerCase() === (wl.name || '').toLowerCase());
            if (found) watchlistIdMap[wl.id] = found.id;
          } catch {}
        }
      }

      let importedCount = 0;
      const moviesList: any[] = payload.movies || [];

      for (let i = 0; i < moviesList.length; i++) {
        if (cancelImportRef.current) {
          setImportProgress(prev => ({
            ...prev,
            status: 'cancelled',
            stage: 'Import paused by user',
            current: importedCount,
            successMessage: `Import paused. Successfully restored ${importedCount} of ${totalMovies} titles before cancellation.`,
          }));
          break;
        }

        const movie = moviesList[i];
        const movieTitle = movie.custom_title || movie.title || `Movie #${i + 1}`;
        const posterToRestore = movie.custom_poster_url || (movie.poster_path?.startsWith('http') ? movie.poster_path : null);
        const backdropToRestore = movie.custom_backdrop_url || (movie.backdrop_path?.startsWith('http') ? movie.backdrop_path : null);

        setImportProgress(prev => ({
          ...prev,
          current: importedCount,
          stage: `Restoring ${i + 1} of ${totalMovies}: ${movieTitle}`,
          currentTitle: movieTitle,
          currentPoster: posterToRestore,
        }));

        try {
          const tmdbId = movie.tmdb_id || movie.id;
          const mediaType = movie.media_type || 'movie';
          if (!tmdbId) continue;

          let userMovieId: string | null = null;
          try {
            const addRes = await api.post('/movies', {
              tmdb_id: tmdbId,
              media_type: mediaType,
              watch_status: movie.watch_status,
              personal_rating: movie.personal_rating,
              is_favorite: movie.is_favorite,
              personal_notes: movie.personal_notes,
            });
            userMovieId = addRes.data?.data?.user_movie_id || addRes.data?.data?.id;
          } catch {
            const listRes = await api.get('/movies?limit=9999');
            const found = (listRes.data?.data?.movies || []).find((m: any) => m.tmdb_id === tmdbId);
            if (found) userMovieId = found.user_movie_id;
          }

          if (userMovieId) {
            await api.patch(`/movies/${userMovieId}`, {
              custom_title: movie.custom_title || null,
              custom_overview: movie.custom_overview || null,
              custom_director: movie.custom_director || null,
              custom_runtime: movie.custom_runtime || null,
              custom_poster_url: posterToRestore,
              custom_backdrop_url: backdropToRestore,
              assigned_genre: movie.assigned_genre || null,
              excluded_genres: Array.isArray(movie.excluded_genres) ? movie.excluded_genres : [],
              trailer_url: movie.trailer_url || null,
              watch_status: movie.watch_status || 'unwatched',
              personal_rating: movie.personal_rating ?? null,
              is_favorite: Boolean(movie.is_favorite),
              personal_notes: movie.personal_notes || null,
              current_season: movie.current_season || 1,
              current_episode: movie.current_episode || 1,
            });

            if (movie.playback_position_sec && movie.playback_position_sec > 0) {
              await api.post(`/sources/movie/${userMovieId}/progress`, {
                positionSec: movie.playback_position_sec,
                completed: movie.watch_status === 'watched',
              });
            }

            if (Array.isArray(movie.sources)) {
              for (const src of movie.sources) {
                try {
                  await api.post('/sources', {
                    userMovieId,
                    sourceType: src.source_type,
                    providerName: src.provider_name,
                    providerIcon: src.provider_icon,
                    externalUrl: src.external_url,
                    externalFileId: src.external_file_id,
                    fileName: src.file_name,
                    quality: src.quality || '4K UHD',
                  });
                } catch {}
              }
            }

            if (Array.isArray(movie.custom_genres)) {
              for (const cg of movie.custom_genres) {
                const targetId = genreIdMap[cg.id] || genreNameMap[(cg.name || '').toLowerCase()] || cg.id;
                try {
                  await api.post('/genres/attach', { userMovieId, customGenreId: targetId });
                } catch {}
              }
            }

            if (Array.isArray(movie.tags)) {
              for (const tag of movie.tags) {
                const targetTagId = tagIdMap[tag.id] || tagNameMap[(tag.name || '').toLowerCase()] || tag.id;
                try {
                  await api.post('/tags/attach', { userMovieId, tagId: targetTagId });
                } catch {}
              }
            }

            if (Array.isArray(movie.watchlists)) {
              for (const wl of movie.watchlists) {
                const targetWlId = watchlistIdMap[wl.id] || wl.id;
                try {
                  await api.post(`/watchlists/${targetWlId}/movies`, { userMovieId });
                } catch {}
              }
            }
          }

          importedCount++;
          setImportProgress(prev => ({
            ...prev,
            current: importedCount,
          }));
        } catch {}
      }

      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });

      if (!cancelImportRef.current) {
        setImportProgress(prev => ({
          ...prev,
          status: 'completed',
          current: importedCount,
          stage: 'All titles restored successfully!',
          successMessage: `Full sanctuary restore complete! ${importedCount} titles with custom posters, backdrops, metadata, OTT links, and progress successfully restored.`,
        }));
      }

      setImportMsg({
        type: 'success',
        text: `Full sanctuary restore complete! ${importedCount} titles with custom posters, backdrops, metadata, OTT links, and progress successfully restored.`
      });
    } catch (err: any) {
      setImportProgress(prev => ({
        ...prev,
        status: 'error',
        stage: 'Import error',
        errorMessage: err.message || 'Import failed. Please check the file format.',
      }));
      setImportMsg({ type: 'error', text: err.message || 'Import failed. Please check the file format.' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleClearLibrary = async () => {
    setClearing(true);
    setClearSuccessMsg(null);
    try {
      await api.delete('/movies/clear/all');
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
      queryClient.invalidateQueries({ queryKey: ['taste-profile'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      setClearSuccessMsg('All imported movies, series, watchlists, and custom genres have been permanently removed from your sanctuary.');
      setClearDialogOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to remove movies, watchlists, and custom genres.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 0.5 }}>
          Sanctuary Settings & Integrations
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
          Personalize recommendation parameters, AI provider adapters, and viewing experience
        </Typography>
      </Box>

      {/* Horizontal Tabs Navigation */}
      <Paper sx={{ backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 2.5, p: 0.5, width: '100%', overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant={isDesktopTabs ? 'fullWidth' : 'scrollable'}
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            width: '100%',
            minHeight: 48,
            '& .MuiTabs-indicator': {
              backgroundColor: '#E5A93C',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
            '& .MuiTabs-scrollButtons': {
              color: '#E5A93C',
              '&.Mui-disabled': { opacity: 0.3 },
            },
            '& .MuiTab-root': {
              color: '#94A3B8',
              fontWeight: 700,
              fontSize: { xs: '0.78rem', sm: '0.84rem', md: '0.88rem' },
              textTransform: 'none',
              minHeight: 48,
              minWidth: { xs: 'auto', sm: 110 },
              px: { xs: 1.5, sm: 2 },
              flex: isDesktopTabs ? 1 : 'none',
              gap: 0.75,
              whiteSpace: 'nowrap',
              '&.Mui-selected': {
                color: '#F8FAFC',
              },
            },
          }}
        >
          <Tab value="account" label="Account & Security" icon={<PersonIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="ai" label="AI Engine & Models" icon={<SmartToyIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="display" label="TV & Display Mode" icon={<DisplaySettingsIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="genres" label="Custom Genres" icon={<CategoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="backup" label="Backup & Restore" icon={<BackupIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="danger" label="Danger Zone" icon={<DeleteSweepIcon sx={{ fontSize: 18, color: '#EF4444' }} />} iconPosition="start" sx={{ '&.Mui-selected': { color: '#EF4444' } }} />
        </Tabs>
      </Paper>

      {/* Tab 1: Account & Security */}
      {activeTab === 'account' && (
        <AccountSecurityTab
          user={user}
          name={name}
          setName={setName}
          runtimeMin={runtimeMin}
          setRuntimeMin={setRuntimeMin}
          runtimeMax={runtimeMax}
          setRuntimeMax={setRuntimeMax}
          profileSaving={profileSaving}
          profileMsg={profileMsg}
          onSaveProfile={handleSaveProfile}
          onChangePassword={handleChangePassword}
          pwSaving={pwSaving}
          pwMsg={pwMsg}
          setPwMsg={setPwMsg}
        />
      )}

      {/* Tab 2: AI Engine & Model Selection */}
      {activeTab === 'ai' && (
        <AiSettingsTab
          aiProvider={aiProvider}
          setAiProvider={setAiProvider}
          aiModel={aiModel}
          setAiModel={setAiModel}
          aiConfigured={aiConfigured}
          aiTesting={aiTesting}
          aiTestResult={aiTestResult}
          aiSaving={aiSaving}
          aiSuccessMsg={aiSuccessMsg}
          onTestAi={handleTestAi}
          onSaveAi={handleSaveAi}
        />
      )}

      {/* Tab 3: Display & TV Navigation Mode */}
      {activeTab === 'display' && (
        <TvDisplayTab
          isTvMode={isTvMode}
          onToggleTvMode={toggleTvMode}
        />
      )}

      {/* Tab 4: Custom Genres Management */}
      {activeTab === 'genres' && (
        <CustomGenresTab
          genresData={genresData}
          onOpenAddGenre={() => {
            setGenreErrorMsg(null);
            setAddGenreOpen(true);
          }}
          onOpenEditGenre={(cg) => {
            setGenreErrorMsg(null);
            setEditingGenre(cg);
          }}
          onOpenDeleteGenre={(genre) => setGenreToDelete(genre)}
        />
      )}

      {/* Tab 5: Bulk Export & Import */}
      {activeTab === 'backup' && (
        <BackupRestoreTab
          exportLoading={exportLoading}
          importLoading={importLoading}
          importMsg={importMsg}
          setImportMsg={setImportMsg}
          onExportData={handleExportData}
          onImportData={handleImportData}
        />
      )}

      {/* Tab 6: Danger Zone */}
      {activeTab === 'danger' && (
        <DangerZoneTab
          clearSuccessMsg={clearSuccessMsg}
          clearDialogOpen={clearDialogOpen}
          setClearDialogOpen={setClearDialogOpen}
          clearing={clearing}
          onClearLibrary={handleClearLibrary}
        />
      )}

      {/* Custom Genre Modals */}
      <CustomGenreModals
        addGenreOpen={addGenreOpen}
        onCloseAddGenre={() => setAddGenreOpen(false)}
        onCreateGenre={(data) => createGenreMutation.mutate(data)}
        isCreatingGenre={createGenreMutation.isPending}
        editingGenre={editingGenre}
        onCloseEditGenre={() => setEditingGenre(null)}
        onUpdateGenre={(id, data) => updateGenreMutation.mutate({ id, data })}
        isUpdatingGenre={updateGenreMutation.isPending}
        genreToDelete={genreToDelete}
        onCloseDeleteGenre={() => setGenreToDelete(null)}
        onConfirmDeleteGenre={(id) => {
          deleteGenreMutation.mutate(id);
          setGenreToDelete(null);
        }}
        isDeletingGenre={deleteGenreMutation.isPending}
        genreErrorMsg={genreErrorMsg}
      />

      {/* Progressive Import & Restore Progress Modal */}
      <ImportProgressModal
        state={importProgress}
        onCancel={() => {
          cancelImportRef.current = true;
          setImportProgress(prev => ({ ...prev, status: 'cancelling' }));
        }}
        onClose={() => setImportProgress(prev => ({ ...prev, isOpen: false }))}
        onViewLibrary={() => {
          setImportProgress(prev => ({ ...prev, isOpen: false }));
          navigate('/movies');
        }}
      />
    </Box>
  );
};
