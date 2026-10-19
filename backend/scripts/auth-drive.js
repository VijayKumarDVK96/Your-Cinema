import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/sources/google-drive/callback';

if (!clientId || !clientSecret) {
  console.error('Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in .env');
  process.exit(1);
}

const authParams = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/drive.readonly',
  access_type: 'offline',
  prompt: 'consent',
});
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;

const codeArg = process.argv[2];

if (!codeArg) {
  console.log('\n======================================================');
  console.log('Google Drive Server-Wide OAuth Token Helper');
  console.log('======================================================\n');
  console.log('Step 1: Open this URL in your browser to grant permission:\n');
  console.log(authUrl);
  console.log('\nStep 2: After granting permission, Google will redirect to:');
  console.log(`${redirectUri}?code=YOUR_AUTH_CODE...`);
  console.log('\nStep 3: Copy the "code" parameter from the URL and run:');
  console.log('node scripts/auth-drive.js YOUR_AUTH_CODE\n');
  process.exit(0);
}

async function exchangeToken(code) {
  console.log('Exchanging authorization code for tokens...');
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: decodeURIComponent(code),
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Token exchange failed:', data);
      process.exit(1);
    }

    const refreshToken = data.refresh_token;
    const accessToken = data.access_token;

    console.log('\nSuccessfully obtained tokens!');
    console.log('Access Token:', accessToken ? `${accessToken.substring(0, 15)}...` : 'None');
    console.log('Refresh Token:', refreshToken ? `${refreshToken.substring(0, 15)}...` : 'None');

    let envContent = fs.readFileSync(envPath, 'utf8');

    if (refreshToken) {
      envContent = envContent.replace(
        /GOOGLE_DRIVE_REFRESH_TOKEN=.*/,
        `GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`
      );
    }
    if (accessToken) {
      envContent = envContent.replace(
        /GOOGLE_DRIVE_ACCESS_TOKEN=.*/,
        `GOOGLE_DRIVE_ACCESS_TOKEN=${accessToken}`
      );
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`\nUpdated ${envPath} successfully!`);
  } catch (err) {
    console.error('Error during token exchange:', err.message);
    process.exit(1);
  }
}

exchangeToken(codeArg);
