import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
} from '@mui/material';
import LocalMoviesIcon from '@mui/icons-material/LocalMovies';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        backgroundColor: '#07090E',
        backgroundImage: 'radial-gradient(ellipse at center, rgba(56,189,248,0.08) 0%, transparent 70%)',
      }}
    >
      <Paper
        sx={{
          p: 4.5,
          maxWidth: 420,
          width: '100%',
          backgroundColor: '#0B0F19',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 3.5,
          textAlign: 'center',
        }}
      >
        <LocalMoviesIcon sx={{ color: '#E5A93C', fontSize: 44, mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.05em' }}>
          BUILD YOUR CINEMA
        </Typography>
        <Typography variant="caption" sx={{ color: '#38BDF8', letterSpacing: '0.15em', fontWeight: 600, display: 'block', mb: 3 }}>
          YOUR MOVIES • YOUR TASTE • YOUR SANCTUARY
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2, textAlign: 'left' }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            fullWidth
            label="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            sx={{ fontWeight: 700, mt: 1, py: 1.2 }}
          >
            {loading ? 'Creating Account...' : 'Create My Cinema'}
          </Button>

          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 2 }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" sx={{ color: '#E5A93C', fontWeight: 600 }}>
              Sign In
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};
