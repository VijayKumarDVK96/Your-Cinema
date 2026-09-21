import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Breadcrumbs,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import { ConfirmDeleteModal } from '../../components/ui/index.js';

export const WatchlistsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Navigation state: current parent folder (null means Root)
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [moviesPage, setMoviesPage] = useState<number>(1);
  const [watchlistToDelete, setWatchlistToDelete] = useState<{ id: string; name: string } | null>(null);

  // Bulk Selection state for movies inside active watchlist
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);
  const [bulkMoveAction, setBulkMoveAction] = useState<'move' | 'copy'>('move');
  const [targetWatchlistIdInput, setTargetWatchlistIdInput] = useState<string>('unassigned');

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [selectedParentIdInput, setSelectedParentIdInput] = useState<string>('root');

  // Query Watchlists for current parent level
  const { data: watchlistsData, isLoading } = useQuery({
    queryKey: ['watchlists', { parentId: currentParentId || 'root', page }],
    queryFn: async () => {
      const p = currentParentId || 'root';
      const res = await api.get(`/watchlists?parentId=${p}&page=${page}&limit=50`);
      return res.data?.data;
    },
  });

  const watchlists: any[] = Array.isArray(watchlistsData) ? watchlistsData : (watchlistsData?.watchlists || []);
  const totalWatchlists: number = watchlistsData?.total ?? watchlists.length;
  const totalPages = Math.max(1, Math.ceil(totalWatchlists / 50));

  // Query ALL watchlists flat (for parent selection dropdown & breadcrumb lookups)
  const { data: allWatchlistsData } = useQuery({
    queryKey: ['all-watchlists-flat'],
    queryFn: async () => {
      const res = await api.get('/watchlists?parentId=all&limit=1000');
      return res.data?.data;
    },
  });
  const flatWatchlists: any[] = Array.isArray(allWatchlistsData) ? allWatchlistsData : (allWatchlistsData?.watchlists || []);

  // Helper: compute path for any watchlist item
  const getWatchlistPath = (wlId: string): { id: string; name: string }[] => {
    const chain: { id: string; name: string }[] = [];
    let currId: string | null = wlId;
    const visited = new Set<string>();

    while (currId && !visited.has(currId)) {
      visited.add(currId);
      const match = flatWatchlists.find((w: any) => w.id === currId);
      if (!match) break;
      chain.unshift({ id: match.id, name: match.name });
      currId = match.parent_id || null;
    }
    return chain;
  };

  const currentPath = currentParentId ? getWatchlistPath(currentParentId) : [];

  // Fetch selected watchlist details (movies & ancestors)
  const activeId = selectedListId || (watchlists.length > 0 && !currentParentId ? watchlists[0].id : null);
  const { data: activeList } = useQuery({
    queryKey: ['watchlist', activeId, moviesPage],
    queryFn: async () => {
      if (!activeId) return null;
      const res = await api.get(`/watchlists/${activeId}?page=${moviesPage}&limit=50`);
      return res.data?.data;
    },
    enabled: !!activeId,
  });

  // Bulk Move / Copy Mutation
  const bulkMoveMutation = useMutation({
    mutationFn: async () => {
      await api.post('/watchlists/bulk-move', {
        userMovieIds: selectedMovieIds,
        targetWatchlistId: targetWatchlistIdInput === 'unassigned' ? null : targetWatchlistIdInput,
        action: bulkMoveAction,
        sourceWatchlistId: activeList?.id,
      });
    },
    onSuccess: () => {
      setSelectedMovieIds([]);
      setBulkMoveModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['watchlist', activeId] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['all-watchlists-flat'] });
      queryClient.invalidateQueries({ queryKey: ['my-movies'] });
    },
  });

  // Create Watchlist / Subfolder Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      await api.post('/watchlists', {
        name: newListName.trim(),
        description: newListDesc.trim() || null,
        parent_id: selectedParentIdInput === 'root' ? null : selectedParentIdInput,
      });
    },
    onSuccess: () => {
      setNewListName('');
      setNewListDesc('');
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['all-watchlists-flat'] });
    },
  });

  // Delete Watchlist Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/watchlists/${id}`);
    },
    onSuccess: () => {
      if (selectedListId) setSelectedListId(null);
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['all-watchlists-flat'] });
    },
  });

  const handleOpenCreateModal = (defaultParentId?: string) => {
    setSelectedParentIdInput(defaultParentId || currentParentId || 'root');
    setNewListName('');
    setNewListDesc('');
    setCreateDialogOpen(true);
  };

  const toggleSelectMovie = (userMovieId: string) => {
    setSelectedMovieIds((prev) =>
      prev.includes(userMovieId) ? prev.filter((id) => id !== userMovieId) : [...prev, userMovieId]
    );
  };

  const handleSelectAllMovies = () => {
    if (!activeList?.movies) return;
    const allIds = activeList.movies.map((m: any) => m.user_movie_id);
    if (selectedMovieIds.length === allIds.length) {
      setSelectedMovieIds([]);
    } else {
      setSelectedMovieIds(allIds);
    }
  };

  const openBulkDialog = (action: 'move' | 'copy') => {
    setBulkMoveAction(action);
    setTargetWatchlistIdInput('unassigned');
    setBulkMoveModalOpen(true);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
            Watchlist Sanctuary
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>
            Organize personal collections, subfolders, retrospectives, and unassigned movie queues
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {currentParentId && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CreateNewFolderIcon />}
              onClick={() => handleOpenCreateModal(currentParentId)}
              sx={{ fontWeight: 700 }}
            >
              Add Subfolder
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenCreateModal()}
            sx={{ fontWeight: 700 }}
          >
            Create Watchlist
          </Button>
        </Box>
      </Box>

      {/* Breadcrumb Navigation Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          px: 2,
          backgroundColor: '#0C101A',
          borderRadius: 2,
          border: '1px solid rgba(255, 255, 255, 0.07)',
        }}
      >
        <Breadcrumbs separator={<ChevronRightIcon sx={{ fontSize: 16, color: '#64748B' }} />}>
          <Box
            onClick={() => {
              setCurrentParentId(null);
              setSelectedListId(null);
              setSelectedMovieIds([]);
              setPage(1);
              setMoviesPage(1);
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              cursor: 'pointer',
              color: currentParentId === null ? '#E5A93C' : '#94A3B8',
              fontWeight: currentParentId === null ? 700 : 500,
              '&:hover': { color: '#E5A93C' },
            }}
          >
            <HomeIcon sx={{ fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 'inherit', color: 'inherit' }}>
              Root Collections
            </Typography>
          </Box>

          {currentPath.map((item, index) => {
            const isLast = index === currentPath.length - 1;
            return (
              <Box
                key={item.id}
                onClick={() => {
                  setCurrentParentId(item.id);
                  setSelectedListId(null);
                  setSelectedMovieIds([]);
                  setPage(1);
                  setMoviesPage(1);
                }}
                sx={{
                  cursor: 'pointer',
                  color: isLast ? '#E5A93C' : '#94A3B8',
                  fontWeight: isLast ? 700 : 500,
                  '&:hover': { color: '#E5A93C' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 'inherit', color: 'inherit' }}>
                  {item.name}
                </Typography>
              </Box>
            );
          })}
        </Breadcrumbs>

        {currentParentId && (
          <Tooltip title="Go up one folder level">
            <IconButton
              size="small"
              onClick={() => {
                const currentItem = flatWatchlists.find((w: any) => w.id === currentParentId);
                setCurrentParentId(currentItem?.parent_id || null);
                setSelectedListId(null);
                setSelectedMovieIds([]);
                setPage(1);
                setMoviesPage(1);
              }}
              sx={{ ml: 'auto', color: '#94A3B8', '&:hover': { color: '#E5A93C' } }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Watchlists / Subfolders Grid */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '1.1rem' }}>
            {currentParentId ? 'Subfolders & Collections' : 'Watchlists & System Folders'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B' }}>
            Showing {watchlists.length} of {totalWatchlists} items
          </Typography>
        </Box>

        {isLoading ? (
          <Typography variant="body2" sx={{ color: '#94A3B8', py: 4 }}>
            Loading watchlists...
          </Typography>
        ) : watchlists.length > 0 ? (
          <Grid container spacing={2}>
            {watchlists.map((wl: any) => {
              const isActive = wl.id === activeId;
              const isSystem = Boolean(wl.is_system);
              const hasSubfolders = (wl.subfolder_count || 0) > 0;

              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={wl.id}>
                  <Card
                    onClick={() => {
                      setSelectedListId(wl.id);
                      setSelectedMovieIds([]);
                      setMoviesPage(1);
                    }}
                    sx={{
                      cursor: 'pointer',
                      border: isActive
                        ? '2px solid #E5A93C'
                        : isSystem
                        ? '1px solid rgba(56, 189, 248, 0.3)'
                        : '1px solid rgba(255,255,255,0.08)',
                      backgroundColor: isActive ? '#131926' : isSystem ? 'rgba(15, 23, 42, 0.9)' : '#0B0F19',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: '#E5A93C', transform: 'translateY(-2px)' },
                    }}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                          {isSystem ? (
                            <InventoryIcon sx={{ color: '#38BDF8', fontSize: 24 }} />
                          ) : hasSubfolders ? (
                            <FolderOpenIcon sx={{ color: '#E5A93C', fontSize: 24 }} />
                          ) : (
                            <PlaylistPlayIcon sx={{ color: '#A78BFA', fontSize: 24 }} />
                          )}
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '1rem' }}>
                            {wl.name}
                          </Typography>
                        </Box>
                        {!isSystem && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWatchlistToDelete({ id: wl.id, name: wl.name });
                            }}
                            sx={{ color: '#64748B', '&:hover': { color: '#EF4444' } }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>

                      {wl.description && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#64748B',
                            fontSize: '0.8rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {wl.description}
                        </Typography>
                      )}

                      {/* Chips / Badges */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 'auto', pt: 1 }}>
                        {isSystem && (
                          <Chip
                            label="SYSTEM FOLDER"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              color: '#38BDF8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                            }}
                          />
                        )}

                        {wl.subfolder_count > 0 && (
                          <Chip
                            icon={<FolderIcon sx={{ fontSize: '14px !important' }} />}
                            label={`${wl.subfolder_count} subfolder${wl.subfolder_count === 1 ? '' : 's'}`}
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentParentId(wl.id);
                              setSelectedListId(null);
                              setSelectedMovieIds([]);
                              setPage(1);
                            }}
                            sx={{
                              height: 22,
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor: 'rgba(229, 169, 60, 0.15)',
                              color: '#E5A93C',
                              border: '1px solid rgba(229, 169, 60, 0.3)',
                              cursor: 'pointer',
                              '&:hover': { backgroundColor: 'rgba(229, 169, 60, 0.25)' },
                            }}
                          />
                        )}

                        <Chip
                          label={`${wl.movie_count || 0} movie${wl.movie_count === 1 ? '' : 's'}`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: '#94A3B8',
                          }}
                        />

                        {isSystem ? (
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedListId(wl.id);
                              setSelectedMovieIds([]);
                              setMoviesPage(1);
                            }}
                            sx={{ ml: 'auto', fontSize: '0.72rem', fontWeight: 700, color: '#38BDF8', minWidth: 'auto', p: 0.5 }}
                          >
                            View &rarr;
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentParentId(wl.id);
                              setSelectedListId(null);
                              setSelectedMovieIds([]);
                              setPage(1);
                            }}
                            sx={{ ml: 'auto', fontSize: '0.72rem', fontWeight: 700, color: '#38BDF8', minWidth: 'auto', p: 0.5 }}
                          >
                            Open &rarr;
                          </Button>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <EmptyState
            icon={<FolderOpenIcon />}
            title="No collections or subfolders in this section"
            description="Create subcollections (e.g. MCU Collections, Harry Potter Collections) to categorize your films."
            actionLabel="Create Subcollection"
            onAction={() => handleOpenCreateModal(currentParentId || undefined)}
          />
        )}

        {/* Server-Side Pagination for Watchlists */}
        {totalWatchlists > 50 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, val) => setPage(val)}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': { color: '#94A3B8', '&.Mui-selected': { backgroundColor: '#E5A93C', color: '#000', fontWeight: 700 } },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Selected Watchlist Movies Section */}
      {activeList && (
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1 }}>
                🎬 {activeList.name}
                {activeList.is_system && (
                  <Chip
                    label="READ-ONLY SYSTEM FOLDER"
                    size="small"
                    sx={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', fontWeight: 700, height: 22, fontSize: '0.7rem' }}
                  />
                )}
              </Typography>
              {activeList.description && (
                <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>
                  {activeList.description}
                </Typography>
              )}
            </Box>

            {/* Bulk Toolbar Controls */}
            {activeList.movies && activeList.movies.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSelectAllMovies}
                  sx={{ borderColor: 'rgba(255,255,255,0.15)', color: '#94A3B8', fontWeight: 600 }}
                >
                  {selectedMovieIds.length === activeList.movies.length ? 'Deselect All' : 'Select All'}
                </Button>

                {selectedMovieIds.length > 0 && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      startIcon={<DriveFileMoveIcon />}
                      onClick={() => openBulkDialog('move')}
                      sx={{ fontWeight: 700 }}
                    >
                      Move ({selectedMovieIds.length})
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => openBulkDialog('copy')}
                      sx={{ fontWeight: 700 }}
                    >
                      Copy ({selectedMovieIds.length})
                    </Button>
                  </>
                )}

                <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 600 }}>
                  {activeList.total || activeList.movie_count || activeList.movies?.length || 0} titles contained
                </Typography>
              </Box>
            )}
          </Box>

          {activeList.movies && activeList.movies.length > 0 ? (
            <Grid container spacing={2.5}>
              {activeList.movies.map((m: any) => {
                const isSelected = selectedMovieIds.includes(m.user_movie_id);
                return (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={m.user_movie_id}>
                    <Box
                      sx={{
                        position: 'relative',
                        borderRadius: 2,
                        overflow: 'hidden',
                        outline: isSelected ? '3px solid #E5A93C' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectMovie(m.user_movie_id);
                        }}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          zIndex: 10,
                          backgroundColor: isSelected ? '#E5A93C' : 'rgba(15, 23, 42, 0.85)',
                          color: isSelected ? '#000000' : '#FFFFFF',
                          border: '1px solid rgba(255,255,255,0.3)',
                          p: 0.5,
                          '&:hover': { backgroundColor: isSelected ? '#F59E0B' : 'rgba(30, 41, 59, 0.95)' },
                        }}
                      >
                        {isSelected ? <CheckCircleIcon fontSize="small" /> : <CheckCircleOutlineIcon fontSize="small" />}
                      </IconButton>
                      <MovieCard movie={m} />
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          ) : (
            <EmptyState
              icon={<PlaylistPlayIcon />}
              title="This watchlist is empty"
              description="Browse My Movies and assign movies to this collection."
            />
          )}

          {/* Watchlist Movies Server-Side Pagination Bar */}
          {activeList.movies && activeList.movies.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
                mt: 3,
                pt: 2.5,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                Showing {Math.min((moviesPage - 1) * 50 + 1, activeList.total || activeList.movie_count || activeList.movies.length)}–
                {Math.min(moviesPage * 50, activeList.total || activeList.movie_count || activeList.movies.length)} of{' '}
                {activeList.total || activeList.movie_count || activeList.movies.length} titles
              </Typography>

              <Pagination
                count={activeList.totalPages || Math.ceil((activeList.total || activeList.movie_count || activeList.movies.length) / 50) || 1}
                page={moviesPage}
                onChange={(_, val) => {
                  setMoviesPage(val);
                }}
                color="primary"
                sx={{
                  '& .MuiPaginationItem-root': {
                    color: '#94A3B8',
                    fontWeight: 600,
                    '&.Mui-selected': {
                      backgroundColor: '#E5A93C',
                      color: '#000',
                      fontWeight: 700,
                    },
                  },
                }}
              />
            </Box>
          )}
        </Box>
      )}

      {/* Bulk Move / Copy Target Selection Dialog */}
      <Dialog open={bulkMoveModalOpen} onClose={() => setBulkMoveModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700 }}>
          {bulkMoveAction === 'move' ? 'Move' : 'Copy'} {selectedMovieIds.length} Selected Title(s)
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
            Choose the destination collection or subfolder for the selected items:
          </Typography>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#94A3B8' }}>Destination Watchlist</InputLabel>
            <Select
              value={targetWatchlistIdInput}
              label="Destination Watchlist"
              onChange={(e) => setTargetWatchlistIdInput(e.target.value)}
              sx={{ color: '#F8FAFC', backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              {bulkMoveAction === 'move' && (
                <MenuItem value="unassigned">
                  <em>📁 Unassigned Movies (Remove from all Watchlists)</em>
                </MenuItem>
              )}
              {flatWatchlists.map((wl: any) => {
                const path = getWatchlistPath(wl.id).map((p) => p.name).join(' > ');
                return (
                  <MenuItem key={wl.id} value={wl.id}>
                    📁 {path}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkMoveModalOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => bulkMoveMutation.mutate()}
            disabled={bulkMoveMutation.isPending}
          >
            {bulkMoveAction === 'move' ? 'Move Movies' : 'Copy Movies'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Watchlist / Subfolder Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700 }}>
          Create New Watchlist / Subfolder
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            placeholder="e.g. MCU Collection, Avengers Collection, Harry Potter Movies"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            sx={{ my: 2 }}
          />

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel sx={{ color: '#94A3B8' }}>Parent Folder / Collection</InputLabel>
            <Select
              value={selectedParentIdInput}
              label="Parent Folder / Collection"
              onChange={(e) => setSelectedParentIdInput(e.target.value)}
              sx={{ color: '#F8FAFC', backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <MenuItem value="root">
                <em>📁 Root Level (Top Level Watchlist)</em>
              </MenuItem>
              {flatWatchlists.map((wl: any) => {
                const path = getWatchlistPath(wl.id).map(p => p.name).join(' > ');
                return (
                  <MenuItem key={wl.id} value={wl.id}>
                    📁 {path}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Description (Optional)"
            placeholder="e.g. Subcollection for Avengers saga"
            value={newListDesc}
            onChange={(e) => setNewListDesc(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => createMutation.mutate()}
            disabled={!newListName.trim() || createMutation.isPending}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        open={!!watchlistToDelete}
        onClose={() => setWatchlistToDelete(null)}
        onConfirm={() => {
          if (watchlistToDelete) {
            deleteMutation.mutate(watchlistToDelete.id);
            setWatchlistToDelete(null);
          }
        }}
        isLoading={deleteMutation.isPending}
        title="Delete Watchlist / Subfolder"
        description={
          watchlistToDelete
            ? `Are you sure you want to delete "${watchlistToDelete.name}" and all its contents? This action cannot be undone.`
            : ''
        }
      />
    </Box>
  );
};

