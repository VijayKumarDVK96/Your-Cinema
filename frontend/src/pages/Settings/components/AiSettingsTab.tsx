import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  MenuItem,
  Alert,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { AiTestResult } from '../../../types/index.js';

export interface AiSettingsTabProps {
  aiProvider: string;
  setAiProvider: (v: string) => void;
  aiModel: string;
  setAiModel: (v: string) => void;
  aiConfigured: { gemini: boolean; openrouter: boolean };
  aiTesting: boolean;
  aiTestResult: AiTestResult | null;
  aiSaving: boolean;
  aiSuccessMsg: string | null;
  onTestAi: () => void;
  onSaveAi: () => void;
}

export const AiSettingsTab: React.FC<AiSettingsTabProps> = ({
  aiProvider,
  setAiProvider,
  aiModel,
  setAiModel,
  aiConfigured,
  aiTesting,
  aiTestResult,
  aiSaving,
  aiSuccessMsg,
  onTestAi,
  onSaveAi,
}) => {
  return (
    <Paper sx={{ p: 3.5, backgroundColor: '#0B0F19', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon sx={{ color: '#38BDF8' }} />
          <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            AI Engine & Model Selection
          </Typography>
        </Box>
        <Chip
          icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#10B981 !important' }} />}
          label="API Keys Secured in .env"
          size="small"
          sx={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10B981', fontWeight: 600 }}
        />
      </Box>
      <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2.5 }}>
        Switch active AI provider and model at runtime. Sensitive API keys remain strictly secured in the backend environment file.
      </Typography>

      {aiSuccessMsg && (
        <Alert severity="success" sx={{ mb: 2.5 }}>
          {aiSuccessMsg}
        </Alert>
      )}

      {aiTestResult && (
        <Alert
          severity={aiTestResult.success ? 'success' : 'warning'}
          sx={{ mb: 2.5 }}
        >
          {aiTestResult.message} {aiTestResult.latencyMs ? `(${aiTestResult.latencyMs}ms)` : ''}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            select
            label="Active AI Provider"
            value={aiProvider}
            onChange={(e) => {
              const nextProvider = e.target.value;
              setAiProvider(nextProvider);
              setAiModel(nextProvider === 'gemini' ? 'gemini-3.5-flash' : 'anthropic/claude-3.5-sonnet');
            }}
          >
            <MenuItem value="gemini">
              Google Gemini {aiConfigured.gemini ? '(Key Ready in .env)' : '(Key Missing in .env)'}
            </MenuItem>
            <MenuItem value="openrouter">
              OpenRouter {aiConfigured.openrouter ? '(Key Ready in .env)' : '(Key Missing in .env)'}
            </MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Model Identifier"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            helperText={
              aiProvider === 'gemini'
                ? 'e.g. gemini-3.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp'
                : 'e.g. anthropic/claude-3.5-sonnet, openai/gpt-4o-mini'
            }
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={onTestAi}
          disabled={aiTesting}
        >
          {aiTesting ? 'Testing Connection...' : 'Test Connection'}
        </Button>

        <Button
          variant="contained"
          color="primary"
          onClick={onSaveAi}
          disabled={aiSaving}
          sx={{ fontWeight: 700 }}
        >
          {aiSaving ? 'Saving...' : 'Apply AI Settings'}
        </Button>
      </Box>
    </Paper>
  );
};
