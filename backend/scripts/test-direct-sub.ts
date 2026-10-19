import 'dotenv/config';
import { GoogleDriveService } from '../src/modules/sources/googleDrive.service';
import { spawn } from 'child_process';

async function main() {
  const driveFileId = '1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4';
  const source = await GoogleDriveService.getDriveStreamSource(driveFileId);

  console.log('Testing direct Google Drive subtitle extraction...');
  const start = Date.now();

  const headerStr = Object.entries(source.authHeaders)
    .map(([k, v]) => `${k}: ${v}\r\n`)
    .join('');

  const ff = spawn('ffmpeg', [
    '-v', 'error',
    '-hide_banner',
    '-seekable', '1',
    '-headers', headerStr,
    '-i', source.directUrl,
    '-map', '0:s:0',
    '-vn',
    '-an',
    '-c:s', 'webvtt',
    '-f', 'webvtt',
    'pipe:1',
  ]);

  let bytes = 0;
  let firstTime = 0;
  let sample = '';

  ff.stdout.on('data', chunk => {
    if (!firstTime) firstTime = Date.now() - start;
    bytes += chunk.length;
    if (sample.length < 500) sample += chunk.toString();
  });

  ff.stderr.on('data', d => console.log('STDERR:', d.toString()));

  ff.on('close', code => {
    console.log(`Direct extraction finished with code ${code} in ${Date.now() - start}ms. First chunk in ${firstTime}ms. Bytes: ${bytes}`);
    console.log('Sample:\n', sample.slice(0, 300));
    process.exit(0);
  });
}

main().catch(console.error);
