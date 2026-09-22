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
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { MovieCard } from '../../components/common/MovieCard.js';
import { FilterBar } from '../../components/common/FilterBar.js';
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

  // Selected Watchlist in right content pane
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
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

  // Query ALL watchlists flat (for tree hierarchy & parent selection dropdown & breadcrumbs)
  const { data: allWatchlistsData } = useQuery({
    queryKey: ['all-watchlists-flat'],
    queryFn: async () => {
      const res = await api.get('/watchlists?parentId=all&limit=1000');
      return res.data?.data;
    },
  });
  const flatWatchlists: any[] = Array.isArray(allWatchlistsData) ? allWatchlistsData : (allWatchlistsData?.watchlists || []);

  // Query root watchlists to extract system folders & unassigned counts
  const { data: rootWatchlistsData } = useQuery({
    queryKey: ['watchlists-root'],
    queryFn: async () => {
      const res = await api.get('/watchlists?parentId=root&limit=50');
      return res.data?.data;
    },
  });

  const systemFolders = useMemo(() => {
    const rootLists: any[] = Array.isArray(rootWatchlistsData) ? rootWatchlistsData : (rootWatchlistsData?.watchlists || []);
    const sys = rootLists.filter((w: any) => w.is_system);
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
  }, [rootWatchlistsData]);

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

  // Filter state
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<string>('all');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [genreId, setGenreId] = useState<string | number | undefined>(undefined);
  const [language, setLanguage] = useState<string | undefined>(undefined);
  const [ott, setOtt] = useState<string | undefined>(undefined);
  const [tagId, setTagId] = useState<string | undefined>(undefined);
  const [ratingRange, setRatingRange] = useState<[number, number]>([1, 5]);
  const [yearRange, setYearRange] = useState<[number, number]>([1950, new Date().getFullYear()]);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('added_at');

  const searchTerm = searchParams.get('search') || '';
  const ratingMin = ratingRange[0] > 1 ? ratingRange[0] : undefined;
  const ratingMax = ratingRange[1] < 5 ? ratingRange[1] : undefined;
  const yearMin = yearRange[0] > 1950 ? yearRange[0] : undefined;
  const yearMax = yearRange[1] < new Date().getFullYear() ? yearRange[1] : undefined;

  // Query Tags for filter bar dropdown
  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const res = await api.get('/tags');
      return res.data?.data || [];
    },
  });

  // Query Genres for filter bar dropdown
  const { data: genresData } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => {
      const res = await api.get('/genres');
      return res.data?.data;
    },
  });

  // Active selected folder in right content area
  const activeId = useMemo(() => {
    if (selectedListId) return selectedListId;
    if (flatWatchlists.length > 0) return flatWatchlists[0].id;
    return 'unassigned-movies';
  }, [selectedListId, flatWatchlists]);

  const { data: activeList, isLoading: isActiveListLoading } = useQuery({
    queryKey: [
      'watchlist',
      activeId,
      { status, mediaType, genreId, language, ott, tagId, ratingMin, ratingMax, yearMin, yearMax, isFavorite, sortBy, page: moviesPage, search: searchTerm },
    ],
    queryFn: async () => {
      if (!activeId) return null;
      const params = new URLSearchParams();
      params.append('page', moviesPage.toString());
      params.append('limit', '50');
      if (status !== 'all') params.append('status', status);
      if (mediaType !== 'all') params.append('mediaType', mediaType);
      if (genreId !== undefined && genreId !== null) params.append('genreId', genreId.toString());
      if (language) params.append('language', language);
      if (ott) params.append('ott', ott);
      if (tagId) params.append('tagId', tagId);
      if (ratingMin !== undefined) params.append('ratingMin', ratingMin.toString());
      if (ratingMax !== undefined) params.append('ratingMax', ratingMax.toString());
      if (yearMin !== undefined) params.append('yearMin', yearMin.toString());
      if (yearMax !== undefined) params.append('yearMax', yearMax.toString());
      if (isFavorite) params.append('isFavorite', 'true');
      if (searchTerm) params.append('search', searchTerm);
      if (sortBy) params.append('sortBy', sortBy);

      const res = await api.get(`/watchlists/${activeId}?${params.toString()}`);
      return res.data?.data;
    },
    enabled: !!activeId,
  });

  const activeBreadcrumbs = useMemo(() => {
    if (!activeId || activeId.startsWith('unassigned')) {
      return [{ id: activeId || 'unassigned', name: activeList?.name || 'Unassigned Queue' }];
    }
    return getWatchlistPath(activeId);
  }, [activeId, activeList, flatWatchlists]);

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
      queryClient.invalidateQueries({ queryKey: ['watchlists-root'] });
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
        setSelectedMovieIds([]);
        setMoviesPage(1);
      }
      setNewListName('');
      setNewListDesc('');
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['watchlists-root'] });
      queryClient.invalidateQueries({ queryKey: ['all-watchlists-flat'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  // Delete Watchlist Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/watchlists/${id}`);
    },
    onSuccess: (_, deletedId) => {
      if (selectedListId === deletedId) {
        setSelectedListId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['watchlists-root'] });
      queryClient.invalidateQueries({ queryKey: ['all-watchlists-flat'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  const handleOpenCreateModal = (defaultParentId?: string) => {
    const isCustomActive = activeId && !activeId.startsWith('unassigned');
    const initialParent = defaultParentId !== undefined
      ? defaultParentId
      : (isCustomActive ? activeId : 'root');

    setSelectedParentIdInput(initialParent);
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
    const isSelected = activeId === node.id;

    return (
      <React.Fragment key={node.id}>
        <ListItemButton
          onClick={() => {
            setSelectedListId(node.id);
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
          {activeId && !activeId.startsWith('unassigned') && (
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CreateNewFolderIcon />}
              onClick={() => handleOpenCreateModal(activeId)}
              sx={{ fontWeight: 700 }}
            >
              Add Subfolder
            </Button>
          )}
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenCreateModal('root')}
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
                <IconButton size="small" onClick={() => handleOpenCreateModal('root')} sx={{ color: '#E5A93C', p: 0.3 }}>
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

        {/* Right Main Content Area: Selected Watchlist Detail & Movies */}
        <Grid item xs={12} md={8} lg={8.8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Folder Header Banner */}
            <Paper
              sx={{
                p: 2.5,
                backgroundColor: '#0C101A',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2.5,
              }}
            >
              {/* Breadcrumbs navigation */}
              <Box sx={{ mb: 2 }}>
                <Breadcrumbs separator={<ChevronRightIcon sx={{ fontSize: 16, color: '#64748B' }} />}>
                  <Box
                    onClick={() => {
                      if (flatWatchlists.length > 0) {
                        setSelectedListId(flatWatchlists[0].id);
                      }
                      setSelectedMovieIds([]);
                      setMoviesPage(1);
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.75,
                      cursor: 'pointer',
                      color: '#94A3B8',
                      fontWeight: 500,
                      '&:hover': { color: '#E5A93C' },
                    }}
                  >
                    <HomeIcon sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 'inherit', color: 'inherit' }}>
                      Root Collections
                    </Typography>
                  </Box>

                  {activeBreadcrumbs.map((item, index) => {
                    const isLast = index === activeBreadcrumbs.length - 1;
                    return (
                      <Box
                        key={item.id}
                        onClick={() => {
                          if (!isLast) {
                            setSelectedListId(item.id);
                            setSelectedMovieIds([]);
                            setMoviesPage(1);
                          }
                        }}
                        sx={{
                          cursor: isLast ? 'default' : 'pointer',
                          color: isLast ? '#E5A93C' : '#94A3B8',
                          fontWeight: isLast ? 700 : 500,
                          '&:hover': isLast ? {} : { color: '#E5A93C' },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'inherit', color: 'inherit' }}>
                          {item.name}
                        </Typography>
                      </Box>
                    );
                  })}
                </Breadcrumbs>
              </Box>

              {/* Title, Details, & Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ minWidth: 240, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1 }}>
                      {activeList?.system_type === 'series' ? '📺' : activeList?.is_system ? '📦' : '📁'}{' '}
                      {activeList?.name || 'Loading...'}
                    </Typography>

                    {activeList?.is_system ? (
                      <Chip
                        label="READ-ONLY SYSTEM QUEUE"
                        size="small"
                        sx={{
                          backgroundColor: activeList.system_type === 'series' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                          color: activeList.system_type === 'series' ? '#C084FC' : '#38BDF8',
                          fontWeight: 700,
                          height: 22,
                          fontSize: '0.7rem',
                        }}
                      />
                    ) : (
                      <Chip
                        label={`${activeList?.total ?? activeList?.movies?.length ?? 0} titles`}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(229, 169, 60, 0.15)',
                          color: '#E5A93C',
                          fontWeight: 700,
                          height: 22,
                          fontSize: '0.7rem',
                        }}
                      />
                    )}
                  </Box>

                  {activeList?.description && (
                    <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.75 }}>
                      {activeList.description}
                    </Typography>
                  )}
                </Box>

                {/* Folder Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  {!activeList?.is_system && activeId && (
                    <>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<CreateNewFolderIcon />}
                        onClick={() => handleOpenCreateModal(activeId)}
                        sx={{ fontWeight: 700 }}
                      >
                        Add Subfolder
                      </Button>

                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        onClick={() => setWatchlistToDelete({ id: activeList.id, name: activeList.name })}
                        sx={{ fontWeight: 600 }}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </Paper>

            {/* Filter Bar */}
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={(term) => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (term) next.set('search', term);
                  else next.delete('search');
                  return next;
                });
                setMoviesPage(1);
              }}
              status={status}
              onStatusChange={(val) => { setStatus(val); setMoviesPage(1); }}
              selectedMediaType={mediaType}
              onMediaTypeChange={(val) => { setMediaType(val); setMoviesPage(1); }}
              selectedGenre={genreId}
              onGenreChange={(val) => { setGenreId(val); setMoviesPage(1); }}
              selectedOtt={ott}
              onOttChange={(val) => { setOtt(val); setMoviesPage(1); }}
              selectedLanguage={language}
              onLanguageChange={(val) => { setLanguage(val); setMoviesPage(1); }}
              selectedTag={tagId}
              onTagChange={(val) => { setTagId(val); setMoviesPage(1); }}
              ratingRange={ratingRange}
              onRatingRangeChange={(range) => { setRatingRange(range); setMoviesPage(1); }}
              yearRange={yearRange}
              onYearRangeChange={(range) => { setYearRange(range); setMoviesPage(1); }}
              isFavorite={isFavorite}
              onFavoriteToggle={() => { setIsFavorite(!isFavorite); setMoviesPage(1); }}
              sortBy={sortBy}
              onSortChange={(val) => { setSortBy(val); setMoviesPage(1); }}
              availableTags={tagsData || []}
              availableGenres={genresData}
              onReset={() => {
                setStatus('all');
                setMediaType('all');
                setGenreId(undefined);
                setOtt(undefined);
                setLanguage(undefined);
                setTagId(undefined);
                setRatingRange([1, 5]);
                setYearRange([1950, new Date().getFullYear()]);
                setIsFavorite(false);
                setSortBy('added_at');
                setMoviesPage(1);
                setSearchParams({});
              }}
            />

            {/* Movies Content Area */}
            {isActiveListLoading ? (
              <Typography variant="body2" sx={{ color: '#94A3B8', py: 6, textAlign: 'center' }}>
                Loading titles...
              </Typography>
            ) : activeList ? (
              <Box>
                {/* Bulk Toolbar Controls */}
                {activeList.movies && activeList.movies.length > 0 && (
                  <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
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
                    </Box>

                    <Typography variant="caption" sx={{ color: '#E5A93C', fontWeight: 600 }}>
                      {activeList.total || activeList.movie_count || activeList.movies?.length || 0} titles contained
                    </Typography>
                  </Box>
                )}

                {/* Movie Cards Grid */}
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
                    description={
                      !activeList?.is_system
                        ? 'Browse My Movies and assign movies to this collection, or add subfolders to organize your cinema.'
                        : 'No unassigned titles remaining in this queue.'
                    }
                    actionLabel={!activeList?.is_system ? 'Add Subfolder' : undefined}
                    onAction={!activeList?.is_system ? () => handleOpenCreateModal(activeId) : undefined}
                  />
                )}

                {/* Server-Side Pagination Bar */}
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
            ) : null}
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
