import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddToDriveIcon from '@mui/icons-material/AddToDrive';
import TvIcon from '@mui/icons-material/Tv';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InputAdornment from '@mui/material/InputAdornment';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext.js';
import { useTVNavigation } from '../../context/TVNavigationContext.js';
import { api } from '../../api/client.js';

export const SettingsPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { isTvMode, toggleTvMode } = useTVNavigation();
  const queryClient = useQueryClient();

  // Custom Genres Management State
  const [addGenreOpen, setAddGenreOpen] = useState(false);
  const [newGenreName, setNewGenreName] = useState('');
  const [newGenreColor, setNewGenreColor] = useState('#38BDF8');
  const [newGenreDesc, setNewGenreDesc] = useState('');
  const [genreErrorMsg, setGenreErrorMsg] = useState<string | null>(null);

  const [editingGenre, setEditingGenre] = useState<any | null>(null);
  const [editGenreName, setEditGenreName] = useState('');
  const [editGenreColor, setEditGenreColor] = useState('#38BDF8');
  const [editGenreDesc, setEditGenreDesc] = useState('');

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
      setNewGenreName('');
      setNewGenreDesc('');
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

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [runtimeMin, setRuntimeMin] = useState(user?.preferred_runtime_min || 60);
  const [runtimeMax, setRuntimeMax] = useState(user?.preferred_runtime_max || 180);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Change Password State
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // AI Settings State (API keys stored securely in .env, Provider & Model switchable here)
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

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (pwNew.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    setPwSaving(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pwCurrent, newPassword: pwNew });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 900 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 0.5 }}>
          Sanctuary Settings & Integrations
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
          Personalize recommendation parameters, AI provider adapters, and viewing experience
        </Typography>
      </Box>

      {/* 1. Profile Preferences */}
      <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 2 }}>
          Personal Profile & Taste Defaults
        </Typography>

        {profileMsg && <Alert severity="success" sx={{ mb: 2 }}>{profileMsg}</Alert>}

        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              disabled
              label="Email Address"
              value={user?.email || ''}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Preferred Min Runtime (min)"
              value={runtimeMin}
              onChange={(e) => setRuntimeMin(Number(e.target.value))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Preferred Max Runtime (min)"
              value={runtimeMax}
              onChange={(e) => setRuntimeMax(Number(e.target.value))}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveProfile}
            disabled={profileSaving}
          >
            Save Preferences
          </Button>
        </Box>
      </Paper>

      {/* 2. Change Password */}
      <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LockResetIcon sx={{ color: '#38BDF8' }} />
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Change Password
          </Typography>
        </Box>

        {pwMsg && (
          <Alert severity={pwMsg.type} sx={{ mb: 2 }} onClose={() => setPwMsg(null)}>
            {pwMsg.text}
          </Alert>
        )}

        <Grid container spacing={2.5}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Current Password"
              type={showPwCurrent ? 'text' : 'password'}
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPwCurrent((v) => !v)} edge="end" size="small" sx={{ color: '#94A3B8' }}>
                      {showPwCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="New Password"
              type={showPwNew ? 'text' : 'password'}
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              helperText="Minimum 6 characters"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPwNew((v) => !v)} edge="end" size="small" sx={{ color: '#94A3B8' }}>
                      {showPwNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              error={pwConfirm.length > 0 && pwNew !== pwConfirm}
              helperText={pwConfirm.length > 0 && pwNew !== pwConfirm ? 'Passwords do not match' : ' '}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
            startIcon={pwSaving ? <CircularProgress size={16} /> : <LockResetIcon />}
            sx={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
          >
            {pwSaving ? 'Updating…' : 'Update Password'}
          </Button>
        </Box>
      </Paper>

      {/* 3. Pluggable AI Service Configuration */}
      <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesomeIcon sx={{ color: '#38BDF8' }} />
            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
              AI Engine & Model Selection
            </Typography>
          </Box>
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#10B981 !important' }} />}
            label="API Keys Secured in .env"
            size="small"
            sx={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', fontWeight: 600 }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2.5 }}>
          Switch active AI provider and model at runtime. Sensitive API keys remain strictly secured in the backend environment file.
        </Typography>

        {aiSuccessMsg && (
          <Alert severity="success" sx={{ mb: 2.5 }}>
            {aiSuccessMsg}
          </Alert>
        )}

        {aiTestResult && (
          <Alert
            severity={aiTestResult.success ? 'success' : 'warning'}
            sx={{ mb: 2.5 }}
          >
            {aiTestResult.message} {aiTestResult.latencyMs ? `(${aiTestResult.latencyMs}ms)` : ''}
          </Alert>
        )}

        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Active AI Provider"
              value={aiProvider}
              onChange={(e) => {
                const nextProvider = e.target.value;
                setAiProvider(nextProvider);
                setAiModel(nextProvider === 'gemini' ? 'gemini-3.5-flash' : 'anthropic/claude-3.5-sonnet');
              }}
            >
              <MenuItem value="gemini">
                Google Gemini {aiConfigured.gemini ? '(Key Ready in .env)' : '(Key Missing in .env)'}
              </MenuItem>
              <MenuItem value="openrouter">
                OpenRouter {aiConfigured.openrouter ? '(Key Ready in .env)' : '(Key Missing in .env)'}
              </MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Model Identifier"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              helperText={
                aiProvider === 'gemini'
                  ? 'e.g. gemini-3.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp'
                  : 'e.g. anthropic/claude-3.5-sonnet, openai/gpt-4o-mini'
              }
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleTestAi}
            disabled={aiTesting}
          >
            {aiTesting ? 'Testing Connection...' : 'Test Connection'}
          </Button>

          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAi}
            disabled={aiSaving}
            sx={{ fontWeight: 700 }}
          >
            {aiSaving ? 'Saving...' : 'Apply AI Settings'}
          </Button>
        </Box>
      </Paper>

      {/* 3. Google Drive OAuth Integration */}
      <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AddToDriveIcon sx={{ color: '#E5A93C' }} />
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Google Drive Connection
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
          Connect your Google Drive to index video files and stream via authenticated range requests without downloading any video files to the server.
        </Typography>

        <Button
          variant="outlined"
          color="primary"
          startIcon={<AddToDriveIcon />}
          onClick={() => alert('Redirecting to Google OAuth2 flow (requires configured GOOGLE_CLIENT_ID).')}
        >
          Connect Google Drive
        </Button>
      </Paper>

      {/* 4. Display & TV Navigation Mode */}
      <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TvIcon sx={{ color: '#38BDF8' }} />
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Android TV & D-Pad Remote Mode
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
          Enables high-contrast spatial focus rings, D-pad navigation, and 10-foot television display layout.
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={isTvMode}
              onChange={toggleTvMode}
              color="secondary"
            />
          }
          label={isTvMode ? 'TV Mode Active' : 'TV Mode Disabled'}
        />
      </Paper>

      {/* 5. Custom Genres Management */}
      <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <CategoryIcon sx={{ color: '#38BDF8' }} />
              <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                Custom Genres & Category Management
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              Create and customize personal genres beyond standard TMDB categories. Assign custom colors, view film counts, or delete custom categories.
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setGenreErrorMsg(null);
              setAddGenreOpen(true);
            }}
            sx={{ fontWeight: 700 }}
          >
            Create Custom Genre
          </Button>
        </Box>

        {/* Informative Stats */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Chip
            label={`${genresData?.predefined?.length || 18} Standard Predefined Genres`}
            size="small"
            sx={{ backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C', fontWeight: 600 }}
          />
          <Chip
            label={`${genresData?.custom?.length || 0} Custom User Genres`}
            size="small"
            sx={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontWeight: 600 }}
          />
        </Box>

        {/* Custom Genres List */}
        {genresData?.custom && genresData.custom.length > 0 ? (
          <Grid container spacing={2}>
            {genresData.custom.map((cg: any) => (
              <Grid item xs={12} sm={6} md={4} key={cg.id}>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: '#111827',
                    border: `1px solid ${cg.color || '#38BDF8'}44`,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        backgroundColor: cg.color || '#38BDF8',
                        flexShrink: 0,
                      }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" noWrap sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                        {cg.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>
                        {cg.movie_count ?? 0} films in library
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Edit Genre">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingGenre(cg);
                          setEditGenreName(cg.name);
                          setEditGenreColor(cg.color || '#38BDF8');
                          setEditGenreDesc(cg.description || '');
                          setGenreErrorMsg(null);
                        }}
                        sx={{ color: '#94A3B8', '&:hover': { color: '#38BDF8' } }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Genre">
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the custom genre "${cg.name}"?`)) {
                            deleteGenreMutation.mutate(cg.id);
                          }
                        }}
                        sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444' } }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Paper
            sx={{
              p: 3,
              backgroundColor: '#111827',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1.5 }}>
              You haven't created any custom genres yet.
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => {
                setGenreErrorMsg(null);
                setAddGenreOpen(true);
              }}
              sx={{ color: '#38BDF8', borderColor: '#38BDF8' }}
            >
              Create Your First Genre
            </Button>
          </Paper>
        )}
      </Paper>

      {/* 6. Danger Zone: Sanctuary Reset (Movies, Series, Watchlists & Custom Genres) */}
      <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <DeleteSweepIcon sx={{ color: '#EF4444' }} />
          <Typography variant="h6" sx={{ color: '#EF4444', fontWeight: 700 }}>
            Danger Zone — Reset Sanctuary (Movies, Series, Watchlists & Custom Genres)
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
          Permanently remove all imported movies, series, watchlists, custom genres, and viewing history from your personal cinema library. This will reset your library count, all created watchlists, custom defined genres, watch history, personal ratings, custom notes, and list associations. Movies stored on external providers (Google Drive / YouTube / OTT) will remain unaffected.
        </Typography>

        {clearSuccessMsg && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {clearSuccessMsg}
          </Alert>
        )}

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteSweepIcon />}
          onClick={() => setClearDialogOpen(true)}
          sx={{ fontWeight: 700 }}
        >
          Remove All Movies, Series, Watchlists & Custom Genres
        </Button>
      </Paper>

      {/* Clear Library Confirmation Dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon /> Confirm Sanctuary Reset
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#CBD5E1', mb: 2 }}>
            Are you absolutely sure you want to remove <strong>ALL movies, series, watchlists, and custom genres</strong> from your library?
          </Typography>
          <Alert severity="error" sx={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#FCA5A5' }}>
            This action cannot be undone. All your personal ratings, watch history, custom watchlists, custom genres, and customized metadata will be cleared.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setClearDialogOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleClearLibrary}
            disabled={clearing}
            sx={{ fontWeight: 700 }}
          >
            {clearing ? 'Removing...' : 'Yes, Delete Everything'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Custom Genre Dialog */}
      <Dialog
        open={addGenreOpen}
        onClose={() => setAddGenreOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CategoryIcon sx={{ color: '#38BDF8' }} /> New Custom Genre
        </DialogTitle>
        <DialogContent>
          {genreErrorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {genreErrorMsg}
            </Alert>
          )}
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
            Define a personal cinematic genre or sub-genre for your library:
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Genre Name"
            placeholder="e.g. Cyberpunk, Neo-Noir, Space Opera..."
            value={newGenreName}
            onChange={(e) => setNewGenreName(e.target.value)}
            sx={{ mb: 2.5, input: { color: '#F8FAFC' } }}
          />
          <TextField
            fullWidth
            size="small"
            label="Description (Optional)"
            placeholder="Brief definition or aesthetic summary"
            value={newGenreDesc}
            onChange={(e) => setNewGenreDesc(e.target.value)}
            sx={{ mb: 2.5, input: { color: '#F8FAFC' } }}
          />
          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1 }}>
            Badge Accent Color:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {['#38BDF8', '#EC4899', '#8B5CF6', '#E5A93C', '#10B981', '#F43F5E', '#06B6D4', '#EAB308', '#64748B'].map((c) => (
              <Box
                key={c}
                onClick={() => setNewGenreColor(c)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border: newGenreColor === c ? '2.5px solid #FFF' : '2px solid transparent',
                  transform: newGenreColor === c ? 'scale(1.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAddGenreOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!newGenreName.trim() || createGenreMutation.isPending}
            onClick={() => createGenreMutation.mutate({ name: newGenreName.trim(), color: newGenreColor, description: newGenreDesc.trim() })}
            sx={{ fontWeight: 700 }}
          >
            Create Genre
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Custom Genre Dialog */}
      <Dialog
        open={Boolean(editingGenre)}
        onClose={() => setEditingGenre(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon sx={{ color: '#38BDF8' }} /> Edit Custom Genre
        </DialogTitle>
        <DialogContent>
          {genreErrorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {genreErrorMsg}
            </Alert>
          )}
          <TextField
            fullWidth
            size="small"
            label="Genre Name"
            value={editGenreName}
            onChange={(e) => setEditGenreName(e.target.value)}
            sx={{ my: 2, input: { color: '#F8FAFC' } }}
          />
          <TextField
            fullWidth
            size="small"
            label="Description"
            value={editGenreDesc}
            onChange={(e) => setEditGenreDesc(e.target.value)}
            sx={{ mb: 2.5, input: { color: '#F8FAFC' } }}
          />
          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1 }}>
            Badge Accent Color:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {['#38BDF8', '#EC4899', '#8B5CF6', '#E5A93C', '#10B981', '#F43F5E', '#06B6D4', '#EAB308', '#64748B'].map((c) => (
              <Box
                key={c}
                onClick={() => setEditGenreColor(c)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: c,
                  cursor: 'pointer',
                  border: editGenreColor === c ? '2.5px solid #FFF' : '2px solid transparent',
                  transform: editGenreColor === c ? 'scale(1.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setEditingGenre(null)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!editGenreName.trim() || updateGenreMutation.isPending}
            onClick={() => updateGenreMutation.mutate({
              id: editingGenre.id,
              data: { name: editGenreName.trim(), color: editGenreColor, description: editGenreDesc.trim() },
            })}
            sx={{ fontWeight: 700 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
