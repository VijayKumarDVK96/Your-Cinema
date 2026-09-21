import React, { useState, useMemo } from 'react';
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
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InventoryIcon from '@mui/icons-material/Inventory';
import TvIcon from '@mui/icons-material/Tv';
import MovieIcon from '@mui/icons-material/Movie';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import { ConfirmDeleteModal } from '../../components/ui/index.js';

interface WatchlistNode {
  id: string;
  name: string;
  parent_id: string | null;
  movie_count?: number;
  subfolder_count?: number;
  is_system?: boolean;
  system_type?: 'movies' | 'series';
  description?: string;
  children?: WatchlistNode[];
}

export const WatchlistsPage: React.FC = () => {
  const queryClient = useQueryClient();

  // Navigation state: current parent folder (null means Root)
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [moviesPage, setMoviesPage] = useState<number>(1);
  const [watchlistToDelete, setWatchlistToDelete] = useState<{ id: string; name: string } | null>(null);

  // Tree expanded nodes state
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

  // Bulk Selection state for movies inside active watchlist
  const [selectedMovieIds, setSelectedMovieIds] = useState<string[]>([]);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);
  const [bulkMoveAction, setBulkMoveAction] = useState<'move' | 'copy'>('move');
  const [targetWatchlistIdInput, setTargetWatchlistIdInput] = useState<string>('unassigned-movies');

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

  // Query ALL watchlists flat (for tree hierarchy & parent selection dropdown & breadcrumbs)
  const { data: allWatchlistsData } = useQuery({
    queryKey: ['all-watchlists-flat'],
    queryFn: async () => {
      const res = await api.get('/watchlists?parentId=all&limit=1000');
      return res.data?.data;
    },
  });
  const flatWatchlists: any[] = Array.isArray(allWatchlistsData) ? allWatchlistsData : (allWatchlistsData?.watchlists || []);

  // Extract system folders from root query or calculate fallbacks
  const systemFolders = useMemo(() => {
    const sys = watchlists.filter((w: any) => w.is_system);
    if (sys.length > 0) return sys;
    return [
      {
        id: 'unassigned-movies',
        name: 'Unassigned Movies',
        description: 'Movie titles not added to any folder or collection',
        is_system: true,
        system_type: 'movies',
        movie_count: 0,
      },
      {
        id: 'unassigned-series',
        name: 'Unassigned Web Series',
        description: 'Web series & TV shows not added to any folder or collection',
        is_system: true,
        system_type: 'series',
        movie_count: 0,
      },
    ];
  }, [watchlists]);

  // Build recursive tree of user watchlists
  const watchlistTree = useMemo(() => {
    const listMap = new Map<string, WatchlistNode>();
    const roots: WatchlistNode[] = [];

    flatWatchlists.forEach((item: any) => {
      listMap.set(item.id, {
        ...item,
        children: [],
      });
    });

    listMap.forEach((node) => {
      if (node.parent_id && listMap.has(node.parent_id)) {
        listMap.get(node.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [flatWatchlists]);

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

  // Default to first system folder or first watchlist on root
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
        targetWatchlistId: targetWatchlistIdInput.startsWith('unassigned') ? null : targetWatchlistIdInput,
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
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });

  // Create Watchlist / Subfolder Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/watchlists', {
        name: newListName.trim(),
        description: newListDesc.trim() || null,
        parent_id: selectedParentIdInput === 'root' ? null : selectedParentIdInput,
      });
      return res.data?.data;
    },
    onSuccess: (data) => {
      const newCreatedId = data?.id;
      if (selectedParentIdInput !== 'root' && selectedParentIdInput) {
        setExpandedFolderIds((prev) => new Set(prev).add(selectedParentIdInput));
      }
      if (newCreatedId) {
        setSelectedListId(newCreatedId);
      }
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

  const toggleExpandFolder = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllFolders = () => {
    const allIds = new Set<string>();
    flatWatchlists.forEach((w: any) => allIds.add(w.id));
    setExpandedFolderIds(allIds);
  };

  const collapseAllFolders = () => {
    setExpandedFolderIds(new Set());
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
    setTargetWatchlistIdInput('unassigned-movies');
    setBulkMoveModalOpen(true);
  };

  // Render individual tree item recursively
  const renderTreeItem = (node: WatchlistNode, depth: number = 0) => {
    const hasChildren = (node.children && node.children.length > 0) || (node.subfolder_count || 0) > 0;
    const isExpanded = expandedFolderIds.has(node.id);
    const isSelected = selectedListId === node.id || (activeId === node.id && !selectedListId);

    return (
      <React.Fragment key={node.id}>
        <ListItemButton
          onClick={() => {
            setSelectedListId(node.id);
            setCurrentParentId(node.parent_id || null);
            setSelectedMovieIds([]);
            setMoviesPage(1);
          }}
          sx={{
            pl: depth * 2 + 1.2,
            pr: 1,
            py: 0.75,
            borderRadius: 1.5,
            mb: 0.5,
            backgroundColor: isSelected ? 'rgba(229, 169, 60, 0.15)' : 'transparent',
            border: isSelected ? '1px solid rgba(229, 169, 60, 0.4)' : '1px solid transparent',
            '&:hover': {
              backgroundColor: isSelected ? 'rgba(229, 169, 60, 0.22)' : 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          {hasChildren ? (
            <IconButton
              size="small"
              onClick={(e) => toggleExpandFolder(node.id, e)}
              sx={{ p: 0.3, mr: 0.5, color: isExpanded ? '#E5A93C' : '#94A3B8' }}
            >
              {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            </IconButton>
          ) : (
            <Box sx={{ width: 24, mr: 0.5 }} />
          )}

          <ListItemIcon sx={{ minWidth: 26, color: isSelected ? '#E5A93C' : '#94A3B8' }}>
            {isExpanded ? (
              <FolderOpenIcon sx={{ fontSize: 18, color: '#E5A93C' }} />
            ) : (
              <FolderIcon sx={{ fontSize: 18, color: isSelected ? '#E5A93C' : '#64748B' }} />
            )}
          </ListItemIcon>

          <ListItemText
            primary={node.name}
            primaryTypographyProps={{
              variant: 'body2',
              fontWeight: isSelected ? 700 : 500,
              color: isSelected ? '#F8FAFC' : '#CBD5E1',
              noWrap: true,
              fontSize: '0.85rem',
            }}
          />

          <Chip
            label={node.movie_count ?? 0}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.68rem',
              fontWeight: 700,
              backgroundColor: isSelected ? 'rgba(229, 169, 60, 0.3)' : 'rgba(255, 255, 255, 0.06)',
              color: isSelected ? '#E5A93C' : '#94A3B8',
              ml: 0.5,
            }}
          />

          <Tooltip title={`Add subfolder under "${node.name}"`}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenCreateModal(node.id);
              }}
              sx={{
                p: 0.3,
                ml: 0.5,
                color: '#64748B',
                opacity: 0.6,
                '&:hover': { color: '#38BDF8', opacity: 1 },
              }}
            >
              <AddIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </ListItemButton>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {node.children?.map((child) => renderTreeItem(child, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
            Watchlist Sanctuary
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>
            Organize personal collections, nested subfolders, movies, and unassigned queues
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

      {/* Main Two-Column Layout with Tree Sidebar */}
      <Grid container spacing={3} alignItems="flex-start">
        {/* Left Sidebar: Vertical Folder Tree */}
        <Grid item xs={12} md={4} lg={3.2}>
          <Paper
            sx={{
              p: 2,
              backgroundColor: '#0C101A',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 2.5,
              position: { md: 'sticky' },
              top: { md: 80 },
              maxHeight: { md: 'calc(100vh - 100px)' },
              overflowY: 'auto',
            }}
          >
            {/* Sidebar Title & Controls */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountTreeIcon sx={{ color: '#E5A93C', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F8FAFC', letterSpacing: '0.04em' }}>
                  COLLECTIONS & TREE
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Expand All Folders">
                  <IconButton size="small" onClick={expandAllFolders} sx={{ color: '#94A3B8', p: 0.5 }}>
                    <UnfoldMoreIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Collapse All Folders">
                  <IconButton size="small" onClick={collapseAllFolders} sx={{ color: '#94A3B8', p: 0.5 }}>
                    <UnfoldLessIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Section 1: System Folders */}
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, px: 1, display: 'block', mb: 0.8, letterSpacing: '0.05em' }}>
              SYSTEM QUEUES
            </Typography>

            <List disablePadding sx={{ mb: 2 }}>
              {/* Unassigned Movies */}
              {systemFolders
                .filter((s: any) => s.system_type !== 'series')
                .map((sys: any) => {
                  const isSysActive = activeId === sys.id || (activeId === 'unassigned' && sys.id === 'unassigned-movies');
                  return (
                    <ListItemButton
                      key={sys.id}
                      onClick={() => {
                        setSelectedListId(sys.id);
                        setCurrentParentId(null);
                        setSelectedMovieIds([]);
                        setMoviesPage(1);
                      }}
                      sx={{
                        px: 1.2,
                        py: 0.8,
                        borderRadius: 1.5,
                        mb: 0.5,
                        backgroundColor: isSysActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.02)',
                        border: isSysActive ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid rgba(255,255,255,0.04)',
                        '&:hover': { backgroundColor: 'rgba(56, 189, 248, 0.2)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 28, color: '#38BDF8' }}>
                        <MovieIcon sx={{ fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={sys.name}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: isSysActive ? 700 : 500,
                          color: isSysActive ? '#38BDF8' : '#F8FAFC',
                          fontSize: '0.85rem',
                        }}
                      />
                      <Chip
                        label={`${sys.movie_count ?? 0} movies`}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(56, 189, 248, 0.2)',
                          color: '#38BDF8',
                        }}
                      />
                    </ListItemButton>
                  );
                })}

              {/* Unassigned Web Series */}
              {systemFolders
                .filter((s: any) => s.system_type === 'series')
                .map((sys: any) => {
                  const isSysActive = activeId === sys.id;
                  return (
                    <ListItemButton
                      key={sys.id}
                      onClick={() => {
                        setSelectedListId(sys.id);
                        setCurrentParentId(null);
                        setSelectedMovieIds([]);
                        setMoviesPage(1);
                      }}
                      sx={{
                        px: 1.2,
                        py: 0.8,
                        borderRadius: 1.5,
                        mb: 0.5,
                        backgroundColor: isSysActive ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.02)',
                        border: isSysActive ? '1px solid rgba(168, 85, 247, 0.45)' : '1px solid rgba(255,255,255,0.04)',
                        '&:hover': { backgroundColor: 'rgba(168, 85, 247, 0.2)' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 28, color: '#A855F7' }}>
                        <TvIcon sx={{ fontSize: 18 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={sys.name}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: isSysActive ? 700 : 500,
                          color: isSysActive ? '#C084FC' : '#F8FAFC',
                          fontSize: '0.85rem',
                        }}
                      />
                      <Chip
                        label={`${sys.movie_count ?? 0} series`}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: 'rgba(168, 85, 247, 0.2)',
                          color: '#C084FC',
                        }}
                      />
                    </ListItemButton>
                  );
                })}
            </List>

            <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.07)', mb: 1.5 }} />

            {/* Section 2: Custom Collections Tree */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, mb: 0.8 }}>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, letterSpacing: '0.05em' }}>
                CUSTOM FOLDERS ({flatWatchlists.length})
              </Typography>
              <Tooltip title="Create new root collection">
                <IconButton size="small" onClick={() => handleOpenCreateModal()} sx={{ color: '#E5A93C', p: 0.3 }}>
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>

            <List disablePadding>
              {watchlistTree.map((rootNode) => renderTreeItem(rootNode, 0))}
              {watchlistTree.length === 0 && (
                <Typography variant="body2" sx={{ color: '#64748B', py: 2, px: 1, fontSize: '0.8rem' }}>
                  No custom folders yet. Click "+" to create one!
                </Typography>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Right Main Content Area */}
        <Grid item xs={12} md={8} lg={8.8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Breadcrumb Trail Navigation */}
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
                        setSelectedListId(item.id);
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
                      const parentOfCurrent = currentItem?.parent_id || null;
                      setCurrentParentId(parentOfCurrent);
                      setSelectedListId(parentOfCurrent);
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

            {/* Folder Cards Grid (Subfolders or Root Folders) */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '1.05rem' }}>
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
                    const isActive = wl.id === activeId || (wl.id === 'unassigned-movies' && activeId === 'unassigned');
                    const isSystem = Boolean(wl.is_system);
                    const isTvSystem = wl.system_type === 'series';
                    const hasSubfolders = (wl.subfolder_count || 0) > 0;

                    return (
                      <Grid item xs={12} sm={6} lg={4} key={wl.id}>
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
                              ? isTvSystem
                                ? '1px solid rgba(168, 85, 247, 0.4)'
                                : '1px solid rgba(56, 189, 248, 0.4)'
                              : '1px solid rgba(255,255,255,0.08)',
                            backgroundColor: isActive
                              ? '#131926'
                              : isSystem
                              ? isTvSystem
                                ? 'rgba(30, 20, 45, 0.85)'
                                : 'rgba(15, 23, 42, 0.85)'
                              : '#0B0F19',
                            transition: 'all 0.2s ease',
                            '&:hover': { borderColor: '#E5A93C', transform: 'translateY(-2px)' },
                          }}
                        >
                          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                                {isSystem ? (
                                  isTvSystem ? (
                                    <TvIcon sx={{ color: '#A855F7', fontSize: 24 }} />
                                  ) : (
                                    <InventoryIcon sx={{ color: '#38BDF8', fontSize: 24 }} />
                                  )
                                ) : hasSubfolders ? (
                                  <FolderOpenIcon sx={{ color: '#E5A93C', fontSize: 24 }} />
                                ) : (
                                  <PlaylistPlayIcon sx={{ color: '#A78BFA', fontSize: 24 }} />
                                )}
                                <Typography variant="h6" sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.95rem' }}>
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
                                  fontSize: '0.78rem',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {wl.description}
                              </Typography>
                            )}

                            {/* Chips & Badges */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 'auto', pt: 1 }}>
                              {isSystem && (
                                <Chip
                                  label="SYSTEM FOLDER"
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    backgroundColor: isTvSystem ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                    color: isTvSystem ? '#C084FC' : '#38BDF8',
                                    border: isTvSystem ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
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
                                    setSelectedListId(wl.id);
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
                                label={`${wl.movie_count || 0} ${isTvSystem ? 'series' : 'movies'}`}
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
                                    setSelectedListId(wl.id);
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

            {/* Selected Watchlist Titles Section */}
            {activeList && (
              <Box sx={{ mt: 1, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1 }}>
                      {activeList.system_type === 'series' ? '📺' : '🎬'} {activeList.name}
                      {activeList.is_system && (
                        <Chip
                          label="READ-ONLY SYSTEM FOLDER"
                          size="small"
                          sx={{
                            backgroundColor: activeList.system_type === 'series' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                            color: activeList.system_type === 'series' ? '#C084FC' : '#38BDF8',
                            fontWeight: 700,
                            height: 22,
                            fontSize: '0.7rem',
                          }}
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
                        <Grid item xs={6} sm={4} md={3} lg={2.4} key={m.user_movie_id}>
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
                    title="This collection is empty"
                    description="Browse My Movies and assign movies to this collection."
                  />
                )}

                {/* Watchlist Movies Server-Side Pagination Bar */}
                {activeList.movies && activeList.movies.length > 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
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
          </Box>
        </Grid>
      </Grid>

      {/* Bulk Move / Copy Modal */}
      <Dialog
        open={bulkMoveModalOpen}
        onClose={() => setBulkMoveModalOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: 380,
          },
        }}
      >
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700 }}>
          {bulkMoveAction === 'move' ? 'Move' : 'Copy'} {selectedMovieIds.length} {selectedMovieIds.length === 1 ? 'Movie' : 'Movies'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>
            Choose a target watchlist, subfolder, or unassigned queue:
          </Typography>

          <FormControl fullWidth size="small">
            <InputLabel sx={{ color: '#94A3B8' }}>Target Destination</InputLabel>
            <Select
              value={targetWatchlistIdInput}
              label="Target Destination"
              onChange={(e) => setTargetWatchlistIdInput(e.target.value)}
              sx={{ color: '#F8FAFC' }}
            >
              <MenuItem value="unassigned-movies">
                <em>📦 Unassigned Movies (Detach from folders)</em>
              </MenuItem>
              <MenuItem value="unassigned-series">
                <em>📺 Unassigned Web Series (Detach from folders)</em>
              </MenuItem>
              {flatWatchlists.map((wl: any) => {
                const path = getWatchlistPath(wl.id).map((p) => p.name).join(' / ');
                return (
                  <MenuItem key={wl.id} value={wl.id}>
                    📁 {path} ({wl.movie_count ?? 0})
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBulkMoveModalOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => bulkMoveMutation.mutate()}
            disabled={bulkMoveMutation.isPending}
            sx={{ fontWeight: 700 }}
          >
            {bulkMoveMutation.isPending ? 'Processing...' : `Confirm ${bulkMoveAction === 'move' ? 'Move' : 'Copy'}`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create / Add Subfolder Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#0F172A',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: 380,
          },
        }}
      >
        <DialogTitle sx={{ color: '#F8FAFC', fontWeight: 700 }}>
          {selectedParentIdInput !== 'root' ? 'Create Subfolder / Subcollection' : 'Create New Watchlist'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ color: '#94A3B8' }}>Parent Folder Level</InputLabel>
            <Select
              value={selectedParentIdInput}
              label="Parent Folder Level"
              onChange={(e) => setSelectedParentIdInput(e.target.value)}
              sx={{ color: '#F8FAFC' }}
            >
              <MenuItem value="root">
                <em>Top Level (Root Collection)</em>
              </MenuItem>
              {flatWatchlists.map((wl: any) => {
                const path = getWatchlistPath(wl.id).map((p) => p.name).join(' / ');
                return (
                  <MenuItem key={wl.id} value={wl.id}>
                    📁 {path}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Folder / Watchlist Name"
            placeholder="e.g. Season 1, MCU Phase 1, Weekend Binge"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            sx={{
              input: { color: '#F8FAFC' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: '#E5A93C' },
                '&.Mui-focused fieldset': { borderColor: '#E5A93C' },
              },
            }}
          />

          <TextField
            fullWidth
            multiline
            rows={2}
            size="small"
            label="Description (Optional)"
            placeholder="Add some context about this collection..."
            value={newListDesc}
            onChange={(e) => setNewListDesc(e.target.value)}
            sx={{
              '& .MuiInputBase-input': { color: '#F8FAFC' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&:hover fieldset': { borderColor: '#E5A93C' },
                '&.Mui-focused fieldset': { borderColor: '#E5A93C' },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCreateDialogOpen(false)} sx={{ color: '#94A3B8' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!newListName.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            sx={{ fontWeight: 700 }}
          >
            {createMutation.isPending ? 'Creating...' : 'Create Folder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete Watchlist Modal */}
      {watchlistToDelete && (
        <ConfirmDeleteModal
          open={Boolean(watchlistToDelete)}
          title={`Delete "${watchlistToDelete.name}"?`}
          description="Are you sure you want to remove this collection? Titles within will remain safely in your library as unassigned."
          confirmText="Delete Collection"
          onClose={() => setWatchlistToDelete(null)}
          onConfirm={() => {
            deleteMutation.mutate(watchlistToDelete.id);
            setWatchlistToDelete(null);
          }}
        />
      )}
    </Box>
  );
};
