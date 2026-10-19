import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  const fileId = '1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4';
  const outDir = path.resolve(process.cwd(), 'cache', 'subtitles');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, `${fileId}_0.vtt`);
  console.log('Extracting subtitle to:', outFile);

  const ff = spawn('ffmpeg', [
    '-v', 'warning',
    '-seekable', '1',
    '-i', `http://127.0.0.1:5000/api/sources/drive/${fileId}/raw`,
    '-map', '0:s:0',
    '-vn',
    '-an',
    '-c:s', 'webvtt',
    '-f', 'webvtt',
    outFile,
  ]);

  ff.stderr.on('data', d => console.log('STDERR:', d.toString()));

  await new Promise((resolve, reject) => {
    ff.on('close', code => {
      if (code === 0) resolve(true);
      else reject(new Error(`Exit code ${code}`));
    });
  });

  const stat = fs.statSync(outFile);
  console.log(`Subtitle extracted successfully! Size: ${stat.size} bytes`);
  process.exit(0);
}

main().catch(console.error);
