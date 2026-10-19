import 'dotenv/config';
import { GoogleDriveService } from '../src/modules/sources/googleDrive.service';
import { spawn } from 'child_process';

async function main() {
  const driveFileId = '1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4';
  const source = await GoogleDriveService.getDriveStreamSource(driveFileId);

  console.log('Got stream source:', {
    directUrl: source.directUrl.slice(0, 80) + '...',
    headers: source.authHeaders,
    fileName: source.fileName,
    totalSize: source.totalSize,
  });

  const headerStr = Object.entries(source.authHeaders)
    .map(([k, v]) => `${k}: ${v}\r\n`)
    .join('');

  const args = [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    '-probesize', '4M',
    '-analyzeduration', '4M',
    '-headers', headerStr,
    '-i', source.directUrl,
  ];

  console.log('Running ffprobe via spawn...');
  const ff = spawn('ffprobe', args);
  let stdout = '';
  let stderr = '';

  ff.stdout.on('data', d => stdout += d.toString());
  ff.stderr.on('data', d => stderr += d.toString());

  await new Promise((resolve, reject) => {
    ff.on('close', code => {
      if (code === 0) resolve(true);
      else reject(new Error(`ffprobe exited with ${code}: ${stderr}`));
    });
  });

  const data = JSON.parse(stdout);
  console.log('DURATION:', data.format?.duration);
  console.log('STREAMS COUNT:', data.streams?.length);
  for (const s of data.streams) {
    console.log(JSON.stringify({
      index: s.index,
      codec_type: s.codec_type,
      codec_name: s.codec_name,
      codec_long_name: s.codec_long_name,
      start_time: s.start_time,
      channels: s.channels,
      channel_layout: s.channel_layout,
      tags: s.tags,
    }, null, 2));
  }
}

main().catch(err => {
  console.error('Probe failed:', err);
  process.exit(1);
});
