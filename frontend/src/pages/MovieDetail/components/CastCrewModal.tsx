import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  InputAdornment,
  Avatar,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { UserMovie } from '../../../types/index.js';

export interface CastCrewModalProps {
  open: boolean;
  onClose: () => void;
  movie: UserMovie;
  initialFilter?: 'all' | 'cast' | 'crew';
}

export const CastCrewModal: React.FC<CastCrewModalProps> = ({
  open,
  onClose,
  movie,
  initialFilter = 'all',
}) => {
  const [modalFilter, setModalFilter] = useState<'all' | 'cast' | 'crew'>(initialFilter);
  const [modalSearch, setModalSearch] = useState('');

  // Keep filter synced if reopened with a different initialFilter
  React.useEffect(() => {
    if (open) {
      setModalFilter(initialFilter);
      setModalSearch('');
    }
  }, [open, initialFilter]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0B0F19',
          backgroundImage: 'radial-gradient(ellipse at top, rgba(30, 41, 59, 0.5) 0%, #0B0F19 70%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 3.5,
          maxHeight: '88vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)',
        },
      }}
    >
      {/* Modal Header */}
      <DialogTitle sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GroupIcon sx={{ color: '#E5A93C', fontSize: 26 }} />
          <Box>
            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 800, lineHeight: 1.2 }}>
              Full Cast & Crew
            </Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              {movie.title} • {(movie.cast_members?.length || 0) + (movie.crew_members?.length || 0)} Total Contributors
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#94A3B8', '&:hover': { color: '#F8FAFC' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {/* Controls: Search & Category Filter Chips */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2, mb: 3 }}>
          {/* Filter Chips */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={`All (${(movie.cast_members?.length || 0) + (movie.crew_members?.length || 0)})`}
              onClick={() => setModalFilter('all')}
              sx={{
                backgroundColor: modalFilter === 'all' ? '#E5A93C' : 'rgba(255, 255, 255, 0.05)',
                color: modalFilter === 'all' ? '#07090E' : '#94A3B8',
                fontWeight: 700,
                cursor: 'pointer',
                '&:hover': { backgroundColor: modalFilter === 'all' ? '#D4982B' : 'rgba(255, 255, 255, 0.1)' },
              }}
            />
            <Chip
              label={`Cast (${movie.cast_members?.length || 0})`}
              onClick={() => setModalFilter('cast')}
              sx={{
                backgroundColor: modalFilter === 'cast' ? '#E5A93C' : 'rgba(255, 255, 255, 0.05)',
                color: modalFilter === 'cast' ? '#07090E' : '#94A3B8',
                fontWeight: 700,
                cursor: 'pointer',
                '&:hover': { backgroundColor: modalFilter === 'cast' ? '#D4982B' : 'rgba(255, 255, 255, 0.1)' },
              }}
            />
            <Chip
              label={`Crew (${movie.crew_members?.length || 0})`}
              onClick={() => setModalFilter('crew')}
              sx={{
                backgroundColor: modalFilter === 'crew' ? '#38BDF8' : 'rgba(255, 255, 255, 0.05)',
                color: modalFilter === 'crew' ? '#07090E' : '#94A3B8',
                fontWeight: 700,
                cursor: 'pointer',
                '&:hover': { backgroundColor: modalFilter === 'crew' ? '#0284C7' : 'rgba(255, 255, 255, 0.1)' },
              }}
            />
          </Box>

          {/* Live Search */}
          <TextField
            size="small"
            placeholder="Search actor or technician..."
            value={modalSearch}
            onChange={(e) => setModalSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#64748B', fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              width: { xs: '100%', sm: 260 },
              input: { color: '#F8FAFC', fontSize: '0.875rem' },
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 2,
                '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
                '&:hover fieldset': { borderColor: '#38BDF8' },
                '&.Mui-focused fieldset': { borderColor: '#38BDF8' },
              },
            }}
          />
        </Box>

        {/* Modal Items Grid */}
        <Grid container spacing={2}>
          {/* Cast Grid */}
          {(modalFilter === 'all' || modalFilter === 'cast') &&
            (movie.cast_members || [])
              .filter((c: any) =>
                !modalSearch ||
                c.name?.toLowerCase().includes(modalSearch.toLowerCase()) ||
                c.character?.toLowerCase().includes(modalSearch.toLowerCase())
              )
              .map((c: any, idx: number) => {
                const photoUrl = c.profile_path
                  ? (c.profile_path.startsWith('http') ? c.profile_path : `https://image.tmdb.org/t/p/w185${c.profile_path}`)
                  : null;
                return (
                  <Grid item xs={6} sm={4} md={3} lg={2.4} key={`cast-${idx}`}>
                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: '14px',
                        overflow: 'hidden',
                        backgroundColor: '#0F172A',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'rgba(229, 169, 60, 0.4)',
                          transform: 'translateY(-3px)',
                        },
                      }}
                    >
                      <Box sx={{ width: '100%', height: 200, overflow: 'hidden', backgroundColor: '#1E293B' }}>
                        {photoUrl ? (
                          <Box component="img" src={photoUrl} alt={c.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Avatar sx={{ width: 48, height: 48, backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C', fontWeight: 800 }}>
                              {c.name.charAt(0)}
                            </Avatar>
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ p: 1.5, flexGrow: 1 }}>
                        <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2, mb: 0.5 }}>
                          {c.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.75rem', display: 'block', lineHeight: 1.2 }}>
                          {c.character || 'Cast'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}

          {/* Crew Grid */}
          {(modalFilter === 'all' || modalFilter === 'crew') &&
            (movie.crew_members || [])
              .filter((member: any) =>
                !modalSearch ||
                member.name?.toLowerCase().includes(modalSearch.toLowerCase()) ||
                member.job?.toLowerCase().includes(modalSearch.toLowerCase()) ||
                member.department?.toLowerCase().includes(modalSearch.toLowerCase())
              )
              .map((member: any, idx: number) => {
                const job = member.job || 'Crew';
                let roleColor = '#38BDF8';
                if (job.includes('Director')) roleColor = '#E5A93C';
                else if (job.includes('Music') || job.includes('Composer')) roleColor = '#A855F7';
                else if (job.includes('Photography') || job.includes('Camera')) roleColor = '#06B6D4';
                else if (job.includes('Editor')) roleColor = '#10B981';
                else if (job.includes('Writer') || job.includes('Screenplay')) roleColor = '#F59E0B';

                return (
                  <Grid item xs={6} sm={4} md={3} lg={2.4} key={`crew-${idx}`}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: '14px',
                        backgroundColor: '#0F172A',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: `${roleColor}88`,
                          transform: 'translateY(-3px)',
                        },
                      }}
                    >
                      <Chip
                        label={job}
                        size="small"
                        sx={{
                          alignSelf: 'flex-start',
                          height: 20,
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          backgroundColor: `${roleColor}22`,
                          color: roleColor,
                          mb: 1.5,
                        }}
                      />
                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}>
                          {member.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
                          {member.department || 'Crew'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
        </Grid>
      </DialogContent>
    </Dialog>
  );
};
