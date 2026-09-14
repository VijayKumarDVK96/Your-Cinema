import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            px: 3,
            textAlign: 'center',
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 64, color: '#E5A93C', mb: 2 }} />
          <Typography variant="h5" sx={{ color: '#F8FAFC', fontWeight: 700, mb: 1 }}>
            Something didn't load smoothly.
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', maxWidth: 480, mb: 3 }}>
            Your personal library and movie records are completely safe. You can reload this view or return to the home screen.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.location.reload()}
          >
            Reload Sanctuary
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
