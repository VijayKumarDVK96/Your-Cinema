import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../api/client.js';

interface DriveAccountStatus {
  connected: boolean;
  email: string;
  connectedAt?: string;
  apiKeyConfigured: boolean;
  oauthConfigured: boolean;
  serverOAuthConfigured: boolean;
  redirectUri?: string;
}

export const GoogleDriveTab: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<DriveAccountStatus>({
    queryKey: ['google-drive-account'],
    queryFn: async () => {
      const res = await api.get('/sources/google-drive/account');
      return res.data?.data as DriveAccountStatus;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get('/sources/google-drive/auth-url');
      return res.data?.data?.url as string;
    },
    onSuccess: (url) => {
      if (url) window.location.href = url;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/sources/google-drive/account');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-drive-account'] });
      refetch();
    },
  });

  const oauthResult = searchParams.get('drive');
  const errorMessage =
    connectMutation.error ||
    disconnectMutation.error ||
    (oauthResult === 'error' ? new Error(searchParams.get('reason') || 'Google Drive connection failed.') : null);

  const errorText = errorMessage
    ? (errorMessage as any).response?.data?.error?.message ||
      (errorMessage as any).message ||
      'Google Drive request failed.'
    : '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper
        sx={{
          p: 3.5,
          backgroundColor: '#0B0F19',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
          <CloudQueueIcon sx={{ color: '#38BDF8' }} />
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Google Drive Streaming
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2.5, lineHeight: 1.7 }}>
          Your Cinema now streams Drive files through the official Google Drive API.
          Public files need an API key; private files need a connected Google account.
        </Typography>

        {oauthResult === 'connected' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Google Drive connected successfully
            {searchParams.get('email') ? ` as ${searchParams.get('email')}` : ''}.
          </Alert>
        )}

        {(oauthResult === 'error' || errorText) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorText || 'Google Drive connection failed.'}
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip
                icon={data?.apiKeyConfigured ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
                label={data?.apiKeyConfigured ? 'API key configured' : 'API key missing'}
                color={data?.apiKeyConfigured ? 'success' : 'warning'}
                variant="outlined"
              />
              <Chip
                icon={data?.oauthConfigured ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
                label={data?.oauthConfigured ? 'OAuth configured' : 'OAuth not configured'}
                color={data?.oauthConfigured ? 'success' : 'default'}
                variant="outlined"
              />
              <Chip
                icon={data?.connected ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
                label={data?.connected ? 'Account connected' : 'Account not connected'}
                color={data?.connected ? 'success' : 'default'}
                variant="outlined"
              />
            </Box>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

            <Box>
              <Typography variant="subtitle2" sx={{ color: '#E2E8F0', fontWeight: 700, mb: 0.5 }}>
                {data?.connected ? 'Connected account' : 'Private Drive files'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                {data?.connected
                  ? `${data.email || 'Google account'}${data.connectedAt ? ` · connected ${new Date(data.connectedAt).toLocaleDateString()}` : ''}`
                  : 'Connect the Google account that owns your movies to play private files. Public "Anyone with the link" files work with the API key alone.'}
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {data?.connected ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<LinkIcon />}
                    onClick={() => connectMutation.mutate()}
                    disabled={connectMutation.isPending || !data?.oauthConfigured}
                  >
                    Reconnect
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<LinkOffIcon />}
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? 'Disconnecting…' : 'Disconnect'}
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<LinkIcon />}
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending || !data?.oauthConfigured}
                >
                  {connectMutation.isPending ? 'Opening Google…' : 'Connect Google Drive'}
                </Button>
              )}
              <Button variant="text" onClick={() => refetch()} disabled={isLoading}>
                Refresh status
              </Button>
            </Stack>

            {!data?.oauthConfigured && (
              <Alert severity="info" sx={{ mt: 0.5 }}>
                To enable the Connect button, set <code>GOOGLE_CLIENT_ID</code>,{' '}
                <code>GOOGLE_CLIENT_SECRET</code> and <code>GOOGLE_REDIRECT_URI</code> on the
                backend, then add the same redirect URI to your Google Cloud OAuth client.
                {data?.redirectUri && (
                  <Box component="code" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>
                    {data.redirectUri}
                  </Box>
                )}
              </Alert>
            )}

            {!data?.apiKeyConfigured && (
              <Alert severity="info">
                For public Drive links, create a Google Drive API key and set{' '}
                <code>GOOGLE_DRIVE_API_KEY</code> in <code>backend/.env</code>.
              </Alert>
            )}
          </Stack>
        )}
      </Paper>
    </Box>
  );
};
