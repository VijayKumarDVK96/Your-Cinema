import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import AddLinkIcon from '@mui/icons-material/AddLink';
import MovieIcon from '@mui/icons-material/Movie';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { UserMovie, MovieSource } from '../../../types/index.js';
import { OttBadge, getOttMeta } from '../../../utils/ottProviders.js';
import { isYouTubeSource } from '../../../utils/youtube.js';
import { isDriveSource } from '../../../utils/googleDrive.js';

export interface MovieSourcesSidebarProps {
  movie: UserMovie;
  isResumable: boolean;
  onOpenManageSources: () => void;
  onOpenEditModal: () => void;
  onPlaySource: (src: MovieSource) => void;
  onWatchTrailer: () => void;
  formatRuntime: (mins: number) => string;
}

export const MovieSourcesSidebar: React.FC<MovieSourcesSidebarProps> = ({
  movie,
  isResumable,
  onOpenManageSources,
  onOpenEditModal,
  onPlaySource,
  onWatchTrailer,
  formatRuntime,
}) => {
  const resolveOttUrl = (src: any): string => {
    const raw = src?.external_url || '';
    if (raw && raw.includes('themoviedb.org')) {
      return getOttMeta(src.provider_name, src.provider_icon).getDefaultSearchUrl(movie.title);
    }
    return raw || getOttMeta(src.provider_name, src.provider_icon).getDefaultSearchUrl(movie.title);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Sources & Playback Options */}
      <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Playback & Streaming Sources
          </Typography>
          <Button
            size="small"
            startIcon={<AddLinkIcon />}
            onClick={onOpenManageSources}
            sx={{ color: '#38BDF8', fontSize: '0.78rem' }}
          >
            Manage
          </Button>
        </Box>

        {movie.sources && movie.sources.length > 0 ? (
          <Stack spacing={1.5}>
            {movie.sources.map((src: any) => {
              const isDrive = isDriveSource(src);
              const isYt = isYouTubeSource(src);
              const isOtt = src.source_type === 'ott' && !isDrive && !isYt;
              return (
                <Box
                  key={src.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <OttBadge providerName={src.provider_name} providerIcon={src.provider_icon} size="small" />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>
                        {isDrive ? 'GOOGLE DRIVE' : isYt ? 'YOUTUBE' : src.source_type.replace('_', ' ').toUpperCase()} • {src.quality || '1080p'}
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    endIcon={isOtt && src.external_url ? <OpenInNewIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                    onClick={() => onPlaySource(src)}
                  >
                    {isOtt ? 'Stream' : (isResumable ? 'Resume' : 'Play')}
                  </Button>
                </Box>
              );
            })}
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddLinkIcon />}
              onClick={onOpenManageSources}
              sx={{ borderColor: 'rgba(255,255,255,0.1)', color: '#CBD5E1', mt: 1 }}
            >
              + Link Another Source
            </Button>
          </Stack>
        ) : (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 2 }}>
              No external sources linked yet.
            </Typography>
            <Stack spacing={1.2}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<AddLinkIcon />}
                onClick={onOpenManageSources}
                sx={{ fontWeight: 700 }}
              >
                Link Netflix / Prime / Drive
              </Button>
              {movie.trailer_url && (
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  startIcon={<MovieIcon />}
                  onClick={onWatchTrailer}
                >
                  Watch Official Trailer
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Film / Series Details & Specifications Card */}
      <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <InfoOutlinedIcon sx={{ color: '#E5A93C', fontSize: 20 }} />
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            {movie.media_type === 'tv' ? 'Series Details & Specs' : 'Film Details & Specs'}
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          {movie.media_type === 'tv' ? (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Creator(s)</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                  {(movie.created_by || []).map((c: any) => c.name).join(', ') || movie.director || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Series Status</Typography>
                <Typography variant="body2" sx={{ color: '#38BDF8', fontWeight: 600 }}>{movie.series_status || 'Released'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Total Seasons</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.number_of_seasons || 1}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Total Episodes</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.number_of_episodes || 'N/A'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>First Air Date</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.first_air_date || movie.release_date || 'TBD'}</Typography>
              </Box>
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Director</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.director || 'Unknown'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Release Date</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>{movie.release_date || 'TBD'}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Runtime</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                  {movie.runtime ? `${formatRuntime(movie.runtime)} (${movie.runtime} min)` : 'TBD'}
                </Typography>
              </Box>
            </>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ color: '#64748B' }}>Original Language</Typography>
            <Chip
              label={(movie.original_language || 'EN').toUpperCase()}
              size="small"
              onClick={onOpenEditModal}
              sx={{
                backgroundColor: 'rgba(167, 139, 250, 0.15)',
                color: '#A78BFA',
                fontWeight: 700,
                border: '1px solid rgba(167, 139, 250, 0.3)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                '&:hover': { backgroundColor: 'rgba(167, 139, 250, 0.3)' },
              }}
            />
          </Box>

          {movie.original_title && movie.original_title !== movie.title && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>Original Title</Typography>
              <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600, fontStyle: 'italic' }}>{movie.original_title}</Typography>
            </Box>
          )}
          {movie.spoken_languages && movie.spoken_languages.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Typography variant="body2" sx={{ color: '#64748B' }}>Spoken Languages</Typography>
              <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600, textTransform: 'uppercase' }}>
                {movie.spoken_languages.join(', ')}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};
