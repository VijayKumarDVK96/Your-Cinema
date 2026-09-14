import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cinematicTheme } from './theme/theme.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { TVNavigationProvider } from './context/TVNavigationContext.js';
import { PlayerProvider } from './context/PlayerContext.js';
import { ErrorBoundary } from './components/feedback/ErrorBoundary.js';
import { AppLayout } from './layouts/AppLayout.js';

// Pages
import { HomePage } from './pages/Home/HomePage.js';
import { MyMoviesPage } from './pages/MyMovies/MyMoviesPage.js';
import { MovieDetailPage } from './pages/MovieDetail/MovieDetailPage.js';
import { WatchlistsPage } from './pages/Watchlists/WatchlistsPage.js';
import { RecommendationsPage } from './pages/Recommendations/RecommendationsPage.js';
import { TastePage } from './pages/Taste/TastePage.js';
import { ImportCenterPage } from './pages/ImportCenter/ImportCenterPage.js';
import { SettingsPage } from './pages/Settings/SettingsPage.js';
import { LoginPage } from './pages/Auth/LoginPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#07090E' }}>
        <CircularProgress sx={{ color: '#E5A93C' }} />
      </Box>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#07090E' }}>
        <CircularProgress sx={{ color: '#E5A93C' }} />
      </Box>
    );
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={cinematicTheme}>
          <CssBaseline />
          <AuthProvider>
            <TVNavigationProvider>
              <PlayerProvider>
                <BrowserRouter>
                  <Routes>
                    {/* Public Auth Routes */}
                    <Route
                      path="/login"
                      element={
                        <PublicOnlyRoute>
                          <LoginPage />
                        </PublicOnlyRoute>
                      }
                    />

                    {/* Authenticated Application Layout */}
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <AppLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<HomePage />} />
                      <Route path="movies" element={<MyMoviesPage />} />
                      <Route path="movies/:id" element={<MovieDetailPage />} />
                      <Route path="watchlists" element={<WatchlistsPage />} />
                      <Route path="recommendations" element={<RecommendationsPage />} />
                      <Route path="taste" element={<TastePage />} />
                      <Route path="import" element={<ImportCenterPage />} />
                      <Route path="settings" element={<SettingsPage />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </BrowserRouter>
              </PlayerProvider>
            </TVNavigationProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
