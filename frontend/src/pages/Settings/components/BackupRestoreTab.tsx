import React, { useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import DataObjectIcon from '@mui/icons-material/DataObject';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export interface BackupRestoreTabProps {
  exportLoading: boolean;
  importLoading: boolean;
  importMsg: { type: 'success' | 'error'; text: string } | null;
  setImportMsg: (v: { type: 'success' | 'error'; text: string } | null) => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BackupRestoreTab: React.FC<BackupRestoreTabProps> = ({
  exportLoading,
  importLoading,
  importMsg,
  setImportMsg,
  onExportData,
  onImportData,
}) => {
  const importFileRef = useRef<HTMLInputElement>(null);

  return (
    <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <DataObjectIcon sx={{ color: '#38BDF8' }} />
        <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
          Bulk Export & Import
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2.5 }}>
        Export your entire library — watchlists, edited movies, custom genres, and tags — as a JSON backup file. Use the import to restore or migrate data to another device.
      </Typography>

      {importMsg && (
        <Alert severity={importMsg.type} sx={{ mb: 2 }} onClose={() => setImportMsg(null)}>
          {importMsg.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant="contained"
          startIcon={exportLoading ? <CircularProgress size={16} /> : <FileDownloadIcon />}
          disabled={exportLoading}
          onClick={onExportData}
          sx={{
            background: 'linear-gradient(135deg, #0EA5E9, #38BDF8)',
            fontWeight: 700,
            '&:hover': { background: 'linear-gradient(135deg, #0284C7, #0EA5E9)' },
          }}
        >
          {exportLoading ? 'Exporting...' : 'Export Library as JSON'}
        </Button>

        <input
          ref={importFileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={onImportData}
        />
        <Button
          variant="outlined"
          startIcon={importLoading ? <CircularProgress size={16} /> : <UploadFileIcon />}
          disabled={importLoading}
          onClick={() => importFileRef.current?.click()}
          sx={{ color: '#94A3B8', borderColor: 'rgba(148,163,184,0.3)', fontWeight: 600 }}
        >
          {importLoading ? 'Importing...' : 'Import from JSON Backup'}
        </Button>
      </Box>
    </Paper>
  );
};
