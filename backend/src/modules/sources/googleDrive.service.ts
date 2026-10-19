import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { pool, isPgConnected } from '../../db/index.js';
import { decryptSecret, encryptSecret } from '../../utils/crypto.js';
import { GoogleDriveError } from '../../utils/errors.js';
import { Logger } from '../../utils/logger.js';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const SOURCE_TTL_MS = 20 * 60 * 1000;
const STREAM_TOKEN_TTL = '12h' as const;

type DriveAuthMode = 'user-oauth' | 'server-oauth' | 'api-key' | 'legacy';

interface DriveStreamSource {
  directUrl: string;
  authHeaders: Record<string, string>;
  cookies: string;
  totalSize: number;
  contentType: string;
  fileName?: string;
  isMkvOrNonMp4?: boolean;
  authMode: DriveAuthMode;
  expiresAt: number;
}

interface DriveAccountStatus {
  connected: boolean;
  email: string;
  connectedAt?: string;
  apiKeyConfigured: boolean;
  oauthConfigured: boolean;
  serverOAuthConfigured: boolean;
  redirectUri: string;
}

interface DriveAccountRow {
  user_id: string;
  access_token_encrypted?: string | null;
  refresh_token_encrypted?: string | null;
  token_expiry?: string | Date | null;
  drive_email?: string | null;
  connected_at?: string | null;
}

interface AuthContext {
  mode: 'user-oauth' | 'server-oauth' | 'api-key';
  headers: Record<string, string>;
  key?: string;
}

interface TokenExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

interface DriveFileMetadata {
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

const userTokenCache = new Map<string, { token: string; expiresAt: number }>();
let serverTokenCache: { token: string; expiresAt: number } | null = null;
let serverTokenInFlight: Promise<string | null> | null = null;
const memoryAccounts = new Map<string, DriveAccountRow>();

function isOAuthConfigured(): boolean {
  return Boolean(config.googleDrive.clientId && config.googleDrive.clientSecret);
}

function hasServerOAuth(): boolean {
  return Boolean(
    config.googleDrive.accessToken ||
      (config.googleDrive.refreshToken && isOAuthConfigured())
  );
}

function hasApiKey(): boolean {
  return Boolean(config.googleDrive.apiKey);
}

/**
 * True when at least one official API credential source is available. If none
 * is configured the controller falls back to the legacy public download URL.
 */
function isConfigured(): boolean {
  return hasApiKey() || hasServerOAuth() || isOAuthConfigured();
}

function statusToHttp(status: number): number {
  if (status === 400) return 400;
  if (status === 401) return 401;
  if (status === 403) return 403;
  if (status === 404) return 404;
  if (status === 429) return 429;
  return 502;
}

async function parseApiError(response: globalThis.Response): Promise<string> {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload: any = await response.json();
      const message = payload?.error?.message;
      if (message) return `Google Drive API: ${message}`;
    }
  } catch {}

  if (response.status === 401) {
    return 'Google Drive authorization expired. Reconnect Google Drive in Settings.';
  }
  if (response.status === 403) {
    return 'Google Drive access denied. Connect the Google account that owns this file, or share it as "Anyone with the link".';
  }
  if (response.status === 404) {
    return 'Google Drive file not found or it is not shared with the connected account.';
  }
  if (response.status === 429) {
    return 'Google Drive API rate limit reached. Please retry in a moment.';
  }
  return `Google Drive API returned HTTP ${response.status}.`;
}

async function postToken(body: URLSearchParams): Promise<TokenExchangeResult> {
  const response = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(20_000),
  });

  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GoogleDriveError(
      payload?.error_description || payload?.error || 'Google OAuth token request failed',
      502,
      'DRIVE_OAUTH_TOKEN_ERROR'
    );
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: Number(payload.expires_in) || 3600,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<TokenExchangeResult> {
  if (!isOAuthConfigured()) {
    throw new GoogleDriveError(
      'Google OAuth is not configured. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET.',
      503,
      'DRIVE_OAUTH_NOT_CONFIGURED'
    );
  }

  return postToken(
    new URLSearchParams({
      client_id: config.googleDrive.clientId,
      client_secret: config.googleDrive.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    })
  );
}

async function getServerAccessToken(): Promise<string | null> {
  if (config.googleDrive.accessToken) {
    return config.googleDrive.accessToken;
  }
  if (!config.googleDrive.refreshToken || !isOAuthConfigured()) {
    return null;
  }
  if (serverTokenCache && Date.now() < serverTokenCache.expiresAt) {
    return serverTokenCache.token;
  }
  if (serverTokenInFlight) {
    return serverTokenInFlight;
  }

  serverTokenInFlight = (async () => {
    try {
      const token = await refreshAccessToken(config.googleDrive.refreshToken);
      serverTokenCache = {
        token: token.accessToken,
        expiresAt: Date.now() + Math.max(60, token.expiresIn - 60) * 1000,
      };
      return token.accessToken;
    } catch (err: any) {
      Logger.warn(`Google Drive server OAuth refresh failed: ${err?.message || err}`);
      return null;
    }
  })().finally(() => {
    serverTokenInFlight = null;
  });

  return serverTokenInFlight;
}

async function getAccountRow(userId: string): Promise<DriveAccountRow | null> {
  if (isPgConnected) {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM google_drive_accounts WHERE user_id = $1',
        [userId]
      );
      return rows[0] || null;
    } catch (err: any) {
      Logger.warn(`Failed to read google_drive_accounts: ${err?.message || err}`);
      return null;
    }
  }
  return memoryAccounts.get(userId) || null;
}

async function saveAccountTokens(
  userId: string,
  tokens: TokenExchangeResult,
  email: string
): Promise<void> {
  const accessEncrypted = encryptSecret(tokens.accessToken);
  const refreshEncrypted = tokens.refreshToken
    ? encryptSecret(tokens.refreshToken)
    : null;
  const expiry = new Date(
    Date.now() + Math.max(60, tokens.expiresIn - 60) * 1000
  ).toISOString();

  if (isPgConnected) {
    await pool.query(
      `
        INSERT INTO google_drive_accounts (
          user_id, access_token_encrypted, refresh_token_encrypted,
          token_expiry, drive_email, connected_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          access_token_encrypted = EXCLUDED.access_token_encrypted,
          refresh_token_encrypted = COALESCE(
            EXCLUDED.refresh_token_encrypted,
            google_drive_accounts.refresh_token_encrypted
          ),
          token_expiry = EXCLUDED.token_expiry,
          drive_email = COALESCE(EXCLUDED.drive_email, google_drive_accounts.drive_email),
          connected_at = NOW()
      `,
      [userId, accessEncrypted, refreshEncrypted, expiry, email || null]
    );
    return;
  }

  const existing = memoryAccounts.get(userId);
  memoryAccounts.set(userId, {
    user_id: userId,
    access_token_encrypted: accessEncrypted,
    refresh_token_encrypted:
      refreshEncrypted || existing?.refresh_token_encrypted || null,
    token_expiry: expiry,
    drive_email: email || existing?.drive_email || null,
    connected_at: new Date().toISOString(),
  });
}

async function getUserAccessToken(userId: string): Promise<string | null> {
  const cached = userTokenCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }

  const account = await getAccountRow(userId);
  if (!account) return null;

  const accessToken = decryptSecret(account.access_token_encrypted);
  const expiry = account.token_expiry
    ? new Date(account.token_expiry).getTime()
    : 0;

  if (accessToken && expiry > Date.now() + 60_000) {
    userTokenCache.set(userId, {
      token: accessToken,
      expiresAt: expiry,
    });
    return accessToken;
  }

  const refreshToken = decryptSecret(account.refresh_token_encrypted);
  if (!refreshToken) {
    return accessToken || null;
  }

  try {
    const refreshed = await refreshAccessToken(refreshToken);
    await saveAccountTokens(
      userId,
      {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || refreshToken,
        expiresIn: refreshed.expiresIn,
      },
      account.drive_email || ''
    );
    const expiresAt = Date.now() + Math.max(60, refreshed.expiresIn - 60) * 1000;
    userTokenCache.set(userId, {
      token: refreshed.accessToken,
      expiresAt,
    });
    return refreshed.accessToken;
  } catch (err: any) {
    Logger.warn(`Google Drive user OAuth refresh failed: ${err?.message || err}`);
    return null;
  }
}

async function resolveAuth(userId?: string): Promise<AuthContext> {
  if (userId) {
    const userToken = await getUserAccessToken(userId);
    if (userToken) {
      return {
        mode: 'user-oauth',
        headers: { Authorization: `Bearer ${userToken}` },
      };
    }
  }

  const serverToken = await getServerAccessToken();
  if (serverToken) {
    return {
      mode: 'server-oauth',
      headers: { Authorization: `Bearer ${serverToken}` },
    };
  }

  if (config.googleDrive.apiKey) {
    return {
      mode: 'api-key',
      headers: {},
      key: config.googleDrive.apiKey,
    };
  }

  if (isOAuthConfigured()) {
    throw new GoogleDriveError(
      'Google Drive is not connected. Open Settings → Google Drive and connect your account, or configure GOOGLE_DRIVE_API_KEY for public files.',
      401,
      'DRIVE_NOT_CONNECTED'
    );
  }

  throw new GoogleDriveError(
    'Google Drive API is not configured. Set GOOGLE_DRIVE_API_KEY or Google OAuth credentials.',
    503,
    'DRIVE_NOT_CONFIGURED'
  );
}

async function getFileMetadata(
  fileId: string,
  auth: AuthContext
): Promise<DriveFileMetadata> {
  const params = new URLSearchParams({
    fields: 'id,name,size,mimeType,shortcutDetails',
    supportsAllDrives: 'true',
  });
  if (auth.key) params.set('key', auth.key);

  let response: globalThis.Response;
  try {
    response = await fetch(
      `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`,
      { headers: auth.headers, signal: AbortSignal.timeout(20_000) }
    );
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new GoogleDriveError(
        'Google Drive metadata request timed out. Please retry.',
        504,
        'DRIVE_TIMEOUT'
      );
    }
    throw err;
  }

  if (!response.ok) {
    throw new GoogleDriveError(
      await parseApiError(response),
      statusToHttp(response.status),
      'DRIVE_METADATA_ERROR'
    );
  }

  const data: any = await response.json();

  if (
    data.mimeType === 'application/vnd.google-apps.shortcut' &&
    data.shortcutDetails?.targetId
  ) {
    return getFileMetadata(data.shortcutDetails.targetId, auth);
  }

  return {
    id: data.id || fileId,
    name: data.name || '',
    size: data.size ? Number(data.size) : 0,
    mimeType: data.mimeType || '',
  };
}

/**
 * Resolve a file to an official Drive API media URL and the headers required
 * to read it. The URL is used by the range proxy; FFmpeg never talks to Google
 * directly.
 */
async function getDriveStreamSource(
  fileId: string,
  userId?: string
): Promise<DriveStreamSource> {
  const auth = await resolveAuth(userId);
  const file = await getFileMetadata(fileId, auth);

  const params = new URLSearchParams({
    alt: 'media',
    supportsAllDrives: 'true',
  });
  if (auth.key) params.set('key', auth.key);

  const directUrl = `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?${params.toString()}`;

  let totalSize = file.size;
  let contentType = file.mimeType || 'video/mp4';
  let fileName = file.name || '';

  try {
    const probe = await fetch(directUrl, {
      headers: {
        ...auth.headers,
        Range: 'bytes=0-0',
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (probe.status === 416) {
      // Zero-byte file: metadata still describes it.
    } else if (!probe.ok && probe.status !== 206) {
      throw new GoogleDriveError(
        await parseApiError(probe),
        statusToHttp(probe.status),
        'DRIVE_PROBE_ERROR'
      );
    } else {
      const contentRange = probe.headers.get('content-range');
      if (contentRange) {
        const match = /bytes\s+\d+-\d+\/(\d+)/i.exec(contentRange);
        if (match) totalSize = Number(match[1]) || totalSize;
      }
      if (!totalSize) {
        const contentLength = probe.headers.get('content-length');
        if (contentLength) totalSize = Number(contentLength);
      }

      const probeType = probe.headers.get('content-type');
      if (probeType && !probeType.includes('json') && !probeType.includes('text/html')) {
        contentType = probeType;
      }

      const disposition = probe.headers.get('content-disposition');
      if (disposition) {
        const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";\r\n]+)"?/i);
        if (match?.[1]) fileName = decodeURIComponent(match[1].trim());
      }

      await probe.arrayBuffer().catch(() => {});
    }
  } catch (err: any) {
    if (err instanceof GoogleDriveError) throw err;
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new GoogleDriveError(
        'Google Drive did not respond in time. Please retry.',
        504,
        'DRIVE_TIMEOUT'
      );
    }
    throw err;
  }

  const lowerName = fileName.toLowerCase();
  const lowerType = contentType.toLowerCase();
  const isMkvOrNonMp4 = Boolean(
    (lowerName && !lowerName.endsWith('.mp4')) ||
      lowerType.includes('matroska') ||
      lowerType.includes('mkv')
  );

  return {
    directUrl,
    authHeaders: auth.headers,
    cookies: '',
    totalSize,
    contentType,
    fileName,
    isMkvOrNonMp4,
    authMode: auth.mode,
    expiresAt: Date.now() + SOURCE_TTL_MS,
  };
}

async function getDriveAccountStatus(
  userId: string
): Promise<DriveAccountStatus> {
  const account = await getAccountRow(userId);
  return {
    connected: Boolean(
      account?.refresh_token_encrypted || account?.access_token_encrypted
    ),
    email: account?.drive_email || '',
    connectedAt: account?.connected_at
      ? new Date(account.connected_at).toISOString()
      : undefined,
    apiKeyConfigured: hasApiKey(),
    oauthConfigured: isOAuthConfigured(),
    serverOAuthConfigured: hasServerOAuth(),
    redirectUri: config.googleDrive.redirectUri,
  };
}

function createOAuthState(userId: string): string {
  return jwt.sign(
    { sub: userId, purpose: 'gdrive_oauth' },
    config.jwt.secret,
    { expiresIn: '10m' }
  );
}

function verifyOAuthState(state: string): string {
  try {
    const payload: any = jwt.verify(state, config.jwt.secret);
    if (payload?.purpose !== 'gdrive_oauth' || !payload?.sub) {
      throw new Error('Invalid state');
    }
    return String(payload.sub);
  } catch {
    throw new GoogleDriveError(
      'Google Drive connection request expired. Please try connecting again.',
      400,
      'DRIVE_OAUTH_STATE'
    );
  }
}

function createDriveStreamToken(userId: string, fileId: string): string {
  return jwt.sign(
    { sub: userId, fileId, purpose: 'drive_stream' },
    config.googleDrive.streamTokenSecret,
    { expiresIn: STREAM_TOKEN_TTL }
  );
}

export function verifyDriveStreamToken(
  token: string,
  fileId: string
): string | null {
  try {
    const payload: any = jwt.verify(token, config.googleDrive.streamTokenSecret);
    if (
      payload?.purpose !== 'drive_stream' ||
      payload?.fileId !== fileId ||
      !payload?.sub
    ) {
      return null;
    }
    return String(payload.sub);
  } catch {
    return null;
  }
}

function buildGoogleDriveAuthUrl(userId: string): string {
  if (!isOAuthConfigured()) {
    throw new GoogleDriveError(
      'Google OAuth is not configured. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET.',
      503,
      'DRIVE_OAUTH_NOT_CONFIGURED'
    );
  }

  const params = new URLSearchParams({
    client_id: config.googleDrive.clientId,
    redirect_uri: config.googleDrive.redirectUri,
    response_type: 'code',
    scope: DRIVE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: createOAuthState(userId),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function getUserEmail(accessToken: string): Promise<string> {
  try {
    const response = await fetch(OAUTH_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return '';
    const data: any = await response.json();
    return data?.email || '';
  } catch {
    return '';
  }
}

async function completeGoogleDriveOAuth(
  userId: string,
  code: string
): Promise<{ email: string }> {
  if (!isOAuthConfigured()) {
    throw new GoogleDriveError(
      'Google OAuth is not configured.',
      503,
      'DRIVE_OAUTH_NOT_CONFIGURED'
    );
  }

  const tokens = await postToken(
    new URLSearchParams({
      code,
      client_id: config.googleDrive.clientId,
      client_secret: config.googleDrive.clientSecret,
      redirect_uri: config.googleDrive.redirectUri,
      grant_type: 'authorization_code',
    })
  );

  const email = await getUserEmail(tokens.accessToken);
  await saveAccountTokens(userId, tokens, email);
  userTokenCache.delete(userId);

  return { email };
}

async function disconnectGoogleDrive(userId: string): Promise<void> {
  userTokenCache.delete(userId);
  if (isPgConnected) {
    await pool.query('DELETE FROM google_drive_accounts WHERE user_id = $1', [
      userId,
    ]);
    return;
  }
  memoryAccounts.delete(userId);
}

export const GoogleDriveService = {
  isConfigured,
  isOAuthConfigured,
  hasServerOAuth,
  hasApiKey,
  getDriveStreamSource,
  getDriveAccountStatus,
  buildGoogleDriveAuthUrl,
  completeGoogleDriveOAuth,
  disconnectGoogleDrive,
  createDriveStreamToken,
  verifyDriveStreamToken,
  verifyOAuthState,
};
