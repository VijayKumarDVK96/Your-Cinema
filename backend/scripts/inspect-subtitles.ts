import { spawn } from 'child_process';

async function main() {
  console.log('Testing FFmpeg subtitle extraction WITHOUT manual Range header...');
  const start = Date.now();

  const ff = spawn('ffmpeg', [
    '-v', 'info',
    '-seekable', '1',
    '-i', 'http://127.0.0.1:5000/api/sources/drive/1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4/raw',
    '-map', '0:s:0',
    '-c:s', 'webvtt',
    '-f', 'webvtt',
    'pipe:1',
  ]);

  let totalBytes = 0;
  let firstChunkTime = 0;
  let sample = '';

  ff.stdout.on('data', chunk => {
    if (!firstChunkTime) firstChunkTime = Date.now() - start;
    totalBytes += chunk.length;
    if (sample.length < 500) sample += chunk.toString();
  });

  ff.stderr.on('data', d => console.log('STDERR:', d.toString()));

  ff.on('close', code => {
    console.log(`Finished in ${Date.now() - start}ms. First chunk in ${firstChunkTime}ms. Total bytes: ${totalBytes}`);
    console.log('Sample:\n', sample.slice(0, 300));
    process.exit(0);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
