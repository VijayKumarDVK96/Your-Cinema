import { spawn } from 'child_process';

const fileId = '1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4';
const directUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;

console.log('Testing ffprobe on:', directUrl);

const proc = spawn('ffprobe', [
  '-v', 'error',
  '-probesize', '50M',
  '-analyzeduration', '50M',
  '-show_streams',
  '-of', 'json',
  directUrl
]);

let stdout = '';
let stderr = '';
proc.stdout.on('data', d => stdout += d);
proc.stderr.on('data', d => stderr += d);
proc.on('close', code => {
  console.log('Exit code:', code);
  if (stderr) console.error('Stderr:', stderr);
  try {
    const json = JSON.parse(stdout);
    console.log('Streams found:', json.streams?.map(s => ({
      index: s.index,
      type: s.codec_type,
      codec: s.codec_name,
      tags: s.tags
    })));
  } catch (e) {
    console.error('Parse error:', e.message, 'Output:', stdout);
  }
});
