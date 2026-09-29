async function testGoogleDriveTokens(fileId) {
  // Step 1: Initial request to drive.google.com/uc
  const url1 = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const res1 = await fetch(url1, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  const cookies = res1.headers.get('set-cookie') || '';
  const html1 = await res1.text();
  console.log('Step 1 status:', res1.status, 'HTML length:', html1.length);
  
  // Extract confirm token from form action or hidden inputs
  const confirmMatch = html1.match(/name="confirm"\s+value="([^"]+)"/) || html1.match(/confirm=([0-9a-zA-Z_-]+)/);
  console.log('Confirm token found:', confirmMatch ? confirmMatch[1] : 'none');
  
  // Step 2: Request with confirm token and cookie
  if (confirmMatch) {
    const confirmToken = confirmMatch[1];
    const url2 = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${confirmToken}`;
    const res2 = await fetch(url2, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cookie': cookies
      }
    });
    console.log('Step 2 status:', res2.status, 'Content-Type:', res2.headers.get('content-type'), 'Content-Length:', res2.headers.get('content-length'));
  }
}

testGoogleDriveTokens('1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4').catch(console.error);
