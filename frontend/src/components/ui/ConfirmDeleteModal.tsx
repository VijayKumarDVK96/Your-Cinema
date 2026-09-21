import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
  isLoading = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0F172A',
          backgroundImage: 'none',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, pt: 2, px: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              borderRadius: '12px',
              backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.12)' : 'rgba(229, 169, 60, 0.12)',
              color: isDanger ? '#EF4444' : '#E5A93C',
              border: isDanger ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(229, 169, 60, 0.25)',
              flexShrink: 0,
            }}
          >
            {isDanger ? <DeleteOutlineIcon fontSize="medium" /> : <WarningAmberIcon fontSize="medium" />}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '1.1rem' }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5, py: 1 }}>
        <Typography variant="body2" sx={{ color: '#94A3B8', lineHeight: 1.6 }}>
          {description}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, pt: 2.5, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={isLoading}
          sx={{
            color: '#94A3B8',
            fontWeight: 600,
            px: 2,
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#F8FAFC' },
          }}
        >
          {cancelText}
        </Button>

        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={isLoading}
          startIcon={
            isLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : isDanger ? (
              <DeleteOutlineIcon />
            ) : undefined
          }
          sx={{
            fontWeight: 700,
            px: 2.5,
            backgroundColor: isDanger ? '#EF4444' : '#E5A93C',
            color: isDanger ? '#FFFFFF' : '#000000',
            '&:hover': {
              backgroundColor: isDanger ? '#DC2626' : '#F5C869',
            },
          }}
        >
          {isLoading ? 'Processing...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
