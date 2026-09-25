import React, { useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  IconButton,
  Avatar,
} from '@mui/material';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EngineeringIcon from '@mui/icons-material/Engineering';
import VideocamIcon from '@mui/icons-material/Videocam';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import CreateIcon from '@mui/icons-material/Create';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import GridOnIcon from '@mui/icons-material/GridOn';
import { UserMovie } from '../../../types/index.js';

export interface MovieCastCrewTabProps {
  movie: UserMovie;
  onOpenCastModal: (filter: 'all' | 'cast' | 'crew') => void;
}

export const MovieCastCrewTab: React.FC<MovieCastCrewTabProps> = ({
  movie,
  onOpenCastModal,
}) => {
  const castCarouselRef = useRef<HTMLDivElement>(null);
  const crewCarouselRef = useRef<HTMLDivElement>(null);

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* TOP BILLED CAST CAROUSEL */}
      <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PeopleAltIcon sx={{ color: '#E5A93C' }} />
            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
              Top Billed Cast
            </Typography>
            {movie.cast_members && (
              <Chip label={movie.cast_members.length} size="small" sx={{ backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C', fontWeight: 700, height: 22 }} />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => scrollCarousel(castCarouselRef, 'left')}
              sx={{ color: '#94A3B8', border: '1px solid rgba(255, 255, 255, 0.1)', '&:hover': { color: '#F8FAFC', backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => scrollCarousel(castCarouselRef, 'right')}
              sx={{ color: '#94A3B8', border: '1px solid rgba(255, 255, 255, 0.1)', '&:hover': { color: '#F8FAFC', backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
            >
              <ChevronRightIcon />
            </IconButton>
            <Button
              size="small"
              variant="outlined"
              startIcon={<GridOnIcon />}
              onClick={() => onOpenCastModal('cast')}
              sx={{
                borderColor: 'rgba(229, 169, 60, 0.4)',
                color: '#E5A93C',
                fontWeight: 700,
                ml: 0.5,
                textTransform: 'none',
                '&:hover': { backgroundColor: 'rgba(229, 169, 60, 0.12)', borderColor: '#E5A93C' },
              }}
            >
              View All
            </Button>
          </Box>
        </Box>

        {movie.cast_members && movie.cast_members.length > 0 ? (
          <Box
            ref={castCarouselRef}
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              pb: 1.5,
              pt: 0.5,
              px: 0.5,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 3 },
            }}
          >
            {movie.cast_members.map((c: any, idx: number) => {
              const photoUrl = c.profile_path
                ? (c.profile_path.startsWith('http') ? c.profile_path : `https://image.tmdb.org/t/p/w185${c.profile_path}`)
                : null;
              return (
                <Paper
                  key={idx}
                  elevation={0}
                  sx={{
                    width: 155,
                    minWidth: 155,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    backgroundColor: '#0F172A',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(229, 169, 60, 0.4)',
                      borderColor: 'rgba(229, 169, 60, 0.5)',
                      '& .cast-image': { transform: 'scale(1.06)' },
                    },
                  }}
                  onClick={() => onOpenCastModal('cast')}
                >
                  <Box sx={{ width: '100%', height: 210, overflow: 'hidden', position: 'relative', backgroundColor: '#1E293B' }}>
                    {photoUrl ? (
                      <Box
                        component="img"
                        className="cast-image"
                        src={photoUrl}
                        alt={c.name}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                      />
                    ) : (
                      <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                        <Avatar sx={{ width: 52, height: 52, backgroundColor: 'rgba(229, 169, 60, 0.15)', color: '#E5A93C', fontWeight: 800, fontSize: '1.2rem' }}>
                          {c.name.charAt(0)}
                        </Avatar>
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: '#F8FAFC',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        lineHeight: 1.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        mb: 0.5,
                      }}
                    >
                      {c.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#94A3B8',
                        fontSize: '0.75rem',
                        lineHeight: 1.2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {c.character || 'Cast'}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <PeopleAltIcon sx={{ fontSize: 40, color: '#334155', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              No cast information recorded for this title.
            </Typography>
          </Box>
        )}
      </Paper>

      {/* KEY TECHNICIANS & CREW CAROUSEL */}
      <Paper sx={{ p: 3, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EngineeringIcon sx={{ color: '#38BDF8' }} />
            <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
              Key Technicians & Crew
            </Typography>
            {movie.crew_members && (
              <Chip label={movie.crew_members.length} size="small" sx={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontWeight: 700, height: 22 }} />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              size="small"
              onClick={() => scrollCarousel(crewCarouselRef, 'left')}
              sx={{ color: '#94A3B8', border: '1px solid rgba(255, 255, 255, 0.1)', '&:hover': { color: '#F8FAFC', backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => scrollCarousel(crewCarouselRef, 'right')}
              sx={{ color: '#94A3B8', border: '1px solid rgba(255, 255, 255, 0.1)', '&:hover': { color: '#F8FAFC', backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}
            >
              <ChevronRightIcon />
            </IconButton>
            <Button
              size="small"
              variant="outlined"
              startIcon={<GridOnIcon />}
              onClick={() => onOpenCastModal('crew')}
              sx={{
                borderColor: 'rgba(56, 189, 248, 0.4)',
                color: '#38BDF8',
                fontWeight: 700,
                ml: 0.5,
                textTransform: 'none',
                '&:hover': { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: '#38BDF8' },
              }}
            >
              View All
            </Button>
          </Box>
        </Box>

        {movie.crew_members && movie.crew_members.length > 0 ? (
          <Box
            ref={crewCarouselRef}
            sx={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              pb: 1.5,
              pt: 0.5,
              px: 0.5,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 3 },
            }}
          >
            {movie.crew_members.map((member: any, idx: number) => {
              const job = member.job || 'Crew';
              let icon = <EngineeringIcon sx={{ fontSize: 18, color: '#38BDF8' }} />;
              let roleBadgeColor = '#38BDF8';
              let roleBgColor = 'rgba(56, 189, 248, 0.15)';

              if (job.includes('Director') && !job.includes('Art') && !job.includes('Photography')) {
                icon = <VideocamIcon sx={{ fontSize: 18, color: '#E5A93C' }} />;
                roleBadgeColor = '#E5A93C';
                roleBgColor = 'rgba(229, 169, 60, 0.18)';
              } else if (job.includes('Music') || job.includes('Composer') || member.department === 'Sound') {
                icon = <MusicNoteIcon sx={{ fontSize: 18, color: '#A855F7' }} />;
                roleBadgeColor = '#A855F7';
                roleBgColor = 'rgba(168, 85, 247, 0.18)';
              } else if (job.includes('Photography') || job.includes('Camera') || member.department === 'Camera') {
                icon = <CameraAltIcon sx={{ fontSize: 18, color: '#06B6D4' }} />;
                roleBadgeColor = '#06B6D4';
                roleBgColor = 'rgba(6, 182, 212, 0.18)';
              } else if (job.includes('Editor')) {
                icon = <ContentCutIcon sx={{ fontSize: 18, color: '#10B981' }} />;
                roleBadgeColor = '#10B981';
                roleBgColor = 'rgba(16, 185, 129, 0.18)';
              } else if (job.includes('Writer') || job.includes('Screenplay') || job.includes('Story')) {
                icon = <CreateIcon sx={{ fontSize: 18, color: '#F59E0B' }} />;
                roleBadgeColor = '#F59E0B';
                roleBgColor = 'rgba(245, 158, 11, 0.18)';
              } else if (job.includes('Producer')) {
                icon = <BusinessCenterIcon sx={{ fontSize: 18, color: '#EC4899' }} />;
                roleBadgeColor = '#EC4899';
                roleBgColor = 'rgba(236, 72, 153, 0.18)';
              } else if (job.includes('Stunt')) {
                icon = <SportsMartialArtsIcon sx={{ fontSize: 18, color: '#EF4444' }} />;
                roleBadgeColor = '#EF4444';
                roleBgColor = 'rgba(239, 68, 68, 0.18)';
              }

              return (
                <Paper
                  key={idx}
                  elevation={0}
                  sx={{
                    width: 165,
                    minWidth: 165,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    backgroundColor: '#0F172A',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-6px)',
                      boxShadow: `0 12px 24px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px ${roleBadgeColor}66`,
                      borderColor: `${roleBadgeColor}88`,
                    },
                  }}
                  onClick={() => onOpenCastModal('crew')}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Box sx={{ p: 1, borderRadius: 2, backgroundColor: roleBgColor }}>{icon}</Box>
                    <Chip
                      label={job}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        backgroundColor: roleBgColor,
                        color: roleBadgeColor,
                        maxWidth: 100,
                      }}
                    />
                  </Box>

                  <Box sx={{ mt: 1 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: '#F8FAFC',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        lineHeight: 1.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {member.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
                      {member.department || 'Crew'}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <EngineeringIcon sx={{ fontSize: 40, color: '#334155', mb: 1 }} />
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              No crew information recorded for this title.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
