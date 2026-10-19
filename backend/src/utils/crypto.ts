import crypto from 'crypto';

const KEY_MATERIAL =
  process.env.TOKEN_ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'your_cinema_default_jwt_secret_dev_key';

// Derive a stable 32-byte key for AES-256-GCM from the configured secret.
const ENCRYPTION_KEY = crypto.createHash('sha256').update(KEY_MATERIAL).digest();
const PREFIX = 'v1';

/**
 * Encrypt a secret for storage at rest (OAuth access/refresh tokens).
 * Format: v1:<iv>:<authTag>:<ciphertext> (base64url).
 */
export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

/**
 * Decrypt a secret previously produced by encryptSecret. Plaintext legacy
 * values (from before encryption was introduced) are returned unchanged.
 */
export function decryptSecret(value: string | null | undefined): string {
  if (!value) return '';
  if (!value.startsWith(`${PREFIX}:`)) return value;

  const parts = value.split(':');
  if (parts.length !== 4) return '';

  const [, ivRaw, tagRaw, payloadRaw] = parts;

  try {
    const iv = Buffer.from(ivRaw, 'base64url');
    const tag = Buffer.from(tagRaw, 'base64url');
    const payload = Buffer.from(payloadRaw, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}
