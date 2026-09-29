import fs from 'fs';

async function main() {
  const fileId = '1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4';
  const url = `https://drive.google.com/file/d/${fileId}/preview`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const html = await res.text();
  console.log('HTML status:', res.status, 'HTML size:', html.length);
  fs.writeFileSync('./scratch/preview.html', html);
  
  // Search for fmt_stream_map, audio_tracks, caption_tracks
  const audioMatches = [...html.matchAll(/\"audio[^\"]*\"/gi)].map(m => m[0]);
  console.log('Audio matches in preview:', audioMatches.slice(0, 20));

  const captionMatches = [...html.matchAll(/\"caption[^\"]*\"/gi)].map(m => m[0]);
  console.log('Caption matches in preview:', captionMatches.slice(0, 20));
  
  const trackMatches = [...html.matchAll(/\"ttsurl\"|\"caption_tracks\"|\"audio_tracks\"|\"fmt_stream_map\"/gi)].map(m => m[0]);
  console.log('Track keywords:', trackMatches);
}

main().catch(console.error);
