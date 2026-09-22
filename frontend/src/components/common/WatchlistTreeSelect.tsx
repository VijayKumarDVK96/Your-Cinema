import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Popover,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';

export interface WatchlistNode {
  id: string;
  name: string;
  parent_id: string | null;
  movie_count?: number;
  subfolder_count?: number;
  children?: WatchlistNode[];
}

interface WatchlistTreeSelectProps {
  value: string;
  onChange: (watchlistId: string) => void;
  watchlists: any[];
  label?: string;
  size?: 'small' | 'medium';
  allowNone?: boolean;
  noneLabel?: string;
  allowCreateNew?: boolean;
  onCreateNewClick?: () => void;
  minWidth?: number | string;
  sx?: any;
}

export const WatchlistTreeSelect: React.FC<WatchlistTreeSelectProps> = ({
  value,
  onChange,
  watchlists,
  label = 'Select Watchlist',
  size = 'small',
  allowNone = true,
  noneLabel = 'None (Library only)',
  allowCreateNew = true,
  onCreateNewClick,
  minWidth = 200,
  sx,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());

  // Build recursive tree of watchlists
  const { tree, flatMap } = useMemo(() => {
    const listMap = new Map<string, WatchlistNode>();
    const roots: WatchlistNode[] = [];

    (watchlists || []).forEach((item: any) => {
      listMap.set(item.id, { ...item, children: [] });
    });

    listMap.forEach((node) => {
      if (node.parent_id && listMap.has(node.parent_id)) {
        listMap.get(node.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return { tree: roots, flatMap: listMap };
  }, [watchlists]);

  // Compute label for selected item
  const selectedDisplayLabel = useMemo(() => {
    if (value === 'none') return noneLabel;
    if (value === '__new__') return '+ Create New Watchlist...';
    if (flatMap.has(value)) {
      const match = flatMap.get(value)!;
      return `${match.name} (${match.movie_count ?? 0})`;
    }
    return label;
  }, [value, flatMap, noneLabel, label]);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (id: string) => {
    onChange(id);
    handleClose();
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    flatMap.forEach((_, id) => all.add(id));
    setExpandedFolderIds(all);
  };

  const collapseAll = () => {
    setExpandedFolderIds(new Set());
  };

  // Render tree item recursively
  const renderTreeNodes = (nodes: WatchlistNode[], depth: number = 0) => {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedFolderIds.has(node.id);
      const isSelected = value === node.id;

      return (
        <React.Fragment key={node.id}>
          <ListItemButton
            onClick={() => handleSelect(node.id)}
            sx={{
              pl: depth * 2 + 1,
              pr: 1.5,
              py: 0.5,
              borderRadius: 1.5,
              mb: 0.25,
              backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              '&:hover': {
                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            {/* Expand / Collapse Icon */}
            {hasChildren ? (
              <IconButton
                size="small"
                onClick={(e) => toggleExpand(node.id, e)}
                sx={{
                  p: 0.2,
                  mr: 0.5,
                  color: isExpanded ? '#E5A93C' : '#94A3B8',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                }}
              >
                {isExpanded ? (
                  <ExpandMoreIcon sx={{ fontSize: 16 }} />
                ) : (
                  <ChevronRightIcon sx={{ fontSize: 16 }} />
                )}
              </IconButton>
            ) : (
              <Box sx={{ width: 22, mr: 0.5 }} />
            )}

            {/* Folder Icon */}
            <ListItemIcon sx={{ minWidth: 24, color: isSelected ? '#38BDF8' : '#E5A93C' }}>
              {isExpanded ? (
                <FolderOpenIcon sx={{ fontSize: 18, color: '#E5A93C' }} />
              ) : (
                <FolderIcon sx={{ fontSize: 18, color: isSelected ? '#38BDF8' : '#E5A93C' }} />
              )}
            </ListItemIcon>

            {/* Name */}
            <ListItemText
              primary={node.name}
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: isSelected ? 700 : depth === 0 ? 600 : 500,
                color: isSelected ? '#38BDF8' : depth === 0 ? '#F8FAFC' : '#CBD5E1',
                fontSize: '0.85rem',
                noWrap: true,
              }}
            />

            {/* Count Chip */}
            <Chip
              label={node.movie_count ?? 0}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.68rem',
                fontWeight: 700,
                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                color: isSelected ? '#38BDF8' : '#94A3B8',
                ml: 1,
              }}
            />
          </ListItemButton>

          {/* Render Children if expanded */}
          {hasChildren && isExpanded && renderTreeNodes(node.children!, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <Box sx={{ minWidth, ...sx }}>
      {/* Trigger Button */}
      <Button
        variant="outlined"
        size={size}
        onClick={handleOpen}
        endIcon={<ArrowDropDownIcon sx={{ color: '#94A3B8' }} />}
        sx={{
          width: '100%',
          justifyContent: 'space-between',
          textTransform: 'none',
          backgroundColor: '#0B0F19',
          color: value === '__new__' ? '#38BDF8' : value === 'none' ? '#94A3B8' : '#F8FAFC',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          fontWeight: 600,
          fontSize: '0.85rem',
          px: 1.5,
          py: size === 'small' ? 0.75 : 1,
          '&:hover': {
            borderColor: '#38BDF8',
            backgroundColor: '#0F172A',
          },
        }}
      >
        <Typography variant="body2" noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedDisplayLabel}
        </Typography>
      </Button>

      {/* Dropdown Popover with Expandable/Collapsible Tree */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            backgroundColor: '#0C101A',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 2,
            minWidth: 280,
            maxWidth: 380,
            maxHeight: 380,
            p: 1,
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
          },
        }}
      >
        {/* Tree Header Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em' }}>
            SELECT WATCHLIST
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Expand All">
              <IconButton size="small" onClick={expandAll} sx={{ color: '#94A3B8', p: 0.3 }}>
                <UnfoldMoreIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Collapse All">
              <IconButton size="small" onClick={collapseAll} sx={{ color: '#94A3B8', p: 0.3 }}>
                <UnfoldLessIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <List disablePadding sx={{ pt: 1 }}>
          {/* None Option */}
          {allowNone && (
            <ListItemButton
              onClick={() => handleSelect('none')}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                backgroundColor: value === 'none' ? 'rgba(255,255,255,0.08)' : 'transparent',
              }}
            >
              <ListItemText
                primary={noneLabel}
                primaryTypographyProps={{
                  variant: 'body2',
                  color: value === 'none' ? '#F8FAFC' : '#94A3B8',
                  fontStyle: 'italic',
                  fontSize: '0.85rem',
                }}
              />
            </ListItemButton>
          )}

          {/* Create New Option */}
          {allowCreateNew && (
            <ListItemButton
              onClick={() => {
                if (onCreateNewClick) onCreateNewClick();
                handleSelect('__new__');
              }}
              sx={{
                borderRadius: 1.5,
                mb: 1,
                backgroundColor: value === '__new__' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              }}
            >
              <ListItemIcon sx={{ minWidth: 24, color: '#38BDF8' }}>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="+ Create New Watchlist..."
                primaryTypographyProps={{
                  variant: 'body2',
                  color: '#38BDF8',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              />
            </ListItemButton>
          )}

          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)', mb: 1 }} />

          {/* Expandable Tree Nodes */}
          {renderTreeNodes(tree)}

          {tree.length === 0 && (
            <Typography variant="body2" sx={{ color: '#64748B', p: 1.5, textAlign: 'center', fontSize: '0.8rem' }}>
              No watchlists available.
            </Typography>
          )}
        </List>
      </Popover>
    </Box>
  );
};
