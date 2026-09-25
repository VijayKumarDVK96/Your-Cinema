import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { User } from '../../../types/index.js';

export interface AccountSecurityTabProps {
  user: User | null;
  name: string;
  setName: (v: string) => void;
  runtimeMin: number;
  setRuntimeMin: (v: number) => void;
  runtimeMax: number;
  setRuntimeMax: (v: number) => void;
  profileSaving: boolean;
  profileMsg: string | null;
  onSaveProfile: () => void;
  onChangePassword: (current: string, newPw: string, confirm: string) => Promise<void>;
  pwSaving: boolean;
  pwMsg: { type: 'success' | 'error'; text: string } | null;
  setPwMsg: (v: { type: 'success' | 'error'; text: string } | null) => void;
}

export const AccountSecurityTab: React.FC<AccountSecurityTabProps> = ({
  user,
  name,
  setName,
  runtimeMin,
  setRuntimeMin,
  runtimeMax,
  setRuntimeMax,
  profileSaving,
  profileMsg,
  onSaveProfile,
  onChangePassword,
  pwSaving,
  pwMsg,
  setPwMsg,
}) => {
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);

  const handleSubmitPw = async () => {
    await onChangePassword(pwCurrent, pwNew, pwConfirm);
    setPwCurrent('');
    setPwNew('');
    setPwConfirm('');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
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
            onClick={onSaveProfile}
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
            onClick={handleSubmitPw}
            disabled={pwSaving || !pwCurrent || !pwNew || !pwConfirm}
            startIcon={pwSaving ? <CircularProgress size={16} /> : <LockResetIcon />}
            sx={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}
          >
            {pwSaving ? 'Updating…' : 'Update Password'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
