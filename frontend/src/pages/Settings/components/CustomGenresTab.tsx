import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

export interface CustomGenresTabProps {
  genresData: {
    predefined?: Array<{ id?: string | number; name: string; color?: string }>;
    custom?: Array<{ id: string; name: string; color?: string; description?: string; movie_count?: number }>;
  } | undefined;
  onOpenAddGenre: () => void;
  onOpenEditGenre: (genre: any) => void;
  onOpenDeleteGenre: (genre: { id: string; name: string }) => void;
}

export const CustomGenresTab: React.FC<CustomGenresTabProps> = ({
  genresData,
  onOpenAddGenre,
  onOpenEditGenre,
  onOpenDeleteGenre,
}) => {
  return (
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
          onClick={onOpenAddGenre}
          sx={{ fontWeight: 700 }}
        >
          Create Custom Genre
        </Button>
      </Box>

      {/* Informative Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Chip
          label={`${genresData?.predefined?.length || 26} Standard Predefined Genres`}
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
                      onClick={() => onOpenEditGenre(cg)}
                      sx={{ color: '#94A3B8', '&:hover': { color: '#38BDF8' } }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Genre">
                    <IconButton
                      size="small"
                      onClick={() => onOpenDeleteGenre({ id: cg.id, name: cg.name })}
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
            onClick={onOpenAddGenre}
            sx={{ color: '#38BDF8', borderColor: '#38BDF8' }}
          >
            Create Your First Genre
          </Button>
        </Paper>
      )}
    </Paper>
  );
};
