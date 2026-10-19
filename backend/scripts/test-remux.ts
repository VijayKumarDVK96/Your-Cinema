import { spawn } from 'child_process';
import fs from 'fs';

async function main() {
  console.log('Testing MKV to MP4 remux with -c:v copy -c:a copy...');
  const start = Date.now();

  const ff = spawn('ffmpeg', [
    '-v', 'warning',
    '-i', 'http://127.0.0.1:5000/api/sources/drive/1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4/raw',
    '-t', '15',
    '-map', '0:v:0',
    '-map', '0:a:0',
    '-c:v', 'copy',
    '-c:a', 'copy',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-f', 'mp4',
    'pipe:1',
  ]);

  let bytes = 0;
  ff.stdout.on('data', d => bytes += d.length);
  ff.stderr.on('data', d => console.log('STDERR:', d.toString()));

  await new Promise((resolve) => ff.on('close', resolve));
  console.log(`Remuxed 15s in ${Date.now() - start}ms. Total bytes: ${bytes}`);
  process.exit(0);
}

main().catch(console.error);
