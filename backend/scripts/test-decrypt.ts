import { pool } from '../src/db';
import crypto from 'crypto';

function tryDecrypt(val: string, keyMaterial: string) {
  try {
    const key = crypto.createHash('sha256').update(keyMaterial).digest();
    const parts = val.split(':');
    const [, ivRaw, tagRaw, payloadRaw] = parts;
    const iv = Buffer.from(ivRaw, 'base64url');
    const tag = Buffer.from(tagRaw, 'base64url');
    const payload = Buffer.from(payloadRaw, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
    return decrypted;
  } catch (e: any) {
    return null;
  }
}

async function main() {
  const { rows } = await pool.query('SELECT * FROM google_drive_accounts');
  const acc = rows[0];
  const candidates = [
    'change_me_to_a_long_random_string',
    'your_cinema_default_jwt_secret_dev_key',
    'your_super_secret_jwt_key_change_in_production_12345',
    'dev_jwt_secret_do_not_use_in_prod_change_me_1234567890',
    process.env.TOKEN_ENCRYPTION_KEY || '',
    process.env.JWT_SECRET || '',
  ];

  for (const c of candidates) {
    const res = tryDecrypt(acc.refresh_token_encrypted, c);
    console.log(`Key candidate "${c.slice(0, 15)}...":`, res ? `SUCCESS! Starts with ${res.slice(0, 10)}...` : 'failed');
  }
}

main().catch(console.error);
