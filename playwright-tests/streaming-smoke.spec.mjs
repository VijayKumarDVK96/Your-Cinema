import { test, expect, request as playwrightRequest } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const BASE_URL = process.env.YC_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.YC_API_URL || 'http://localhost:5000/api';
const EMAIL = process.env.YC_EMAIL;
const PASSWORD = process.env.YC_PASSWORD;

const MOVIE = {
  id: 'f617da74-ae9e-4c0a-9094-7fb7f5b302ce',
  title: 'Athiradi',
  driveFileId: '1SJve-e4ygr_h3jMZBvg_Lmj8W8zrFSb4',
  sourceId: 'ebfc5d4e-b68c-471d-89f2-5f1ce76fb141',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loginApi(api) {
  const res = await api.post('/auth/login', {
    data: { email: EMAIL, password: PASSWORD, rememberMe: true },
  });
  if (!res.ok()) {
    throw new Error(`API login failed: ${res.status()} ${await res.text()}`);
  }
  const json = await res.json();
  return json.data.accessToken;
}

async function getProgress(api, token) {
  const res = await api.get(`/sources/movie/${MOVIE.id}/progress`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`Progress fetch failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).data;
}

async function setProgress(api, token, positionSec, completed) {
  const res = await api.post(`/sources/movie/${MOVIE.id}/progress`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      positionSec,
      completed,
      sourceId: MOVIE.sourceId,
      sourceType: 'google_drive',
    },
  });
  if (!res.ok()) {
    throw new Error(`Progress update failed: ${res.status()} ${await res.text()}`);
  }
}

async function getVideoState(page) {
  return page.locator('video').first().evaluate((video) => ({
    currentSrc: video.currentSrc,
    currentTime: video.currentTime,
    duration: video.duration,
    paused: video.paused,
    readyState: video.readyState,
    networkState: video.networkState,
    error: video.error ? { code: video.error.code, message: video.error.message } : null,
    textTracks: Array.from(video.textTracks || []).map((track) => ({
      id: track.id,
      label: track.label,
      language: track.language,
      mode: track.mode,
      cues: track.cues ? track.cues.length : null,
    })),
  }));
}

async function waitForVideoReady(page, label, timeout = 90000) {
  await page.locator('video').first().waitFor({ state: 'attached', timeout });
  await page.waitForFunction(() => {
    const video = document.querySelector('video');
    return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.error);
  }, { timeout });
  const state = await getVideoState(page);
  if (!state.currentSrc.includes(`/api/sources/drive/${MOVIE.driveFileId}/stream`)) {
    throw new Error(`${label}: unexpected stream src ${state.currentSrc}`);
  }
  return state;
}

test.use({
  viewport: { width: 1440, height: 950 },
  ignoreHTTPSErrors: true,
  launchOptions: {
    args: ['--autoplay-policy=no-user-gesture-required'],
  },
});

test.setTimeout(240000);

test('Google Drive streaming supports playback, seeking, subtitles, and audio switching', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Set YC_EMAIL and YC_PASSWORD before running this script.');
  }

  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  const token = await loginApi(api);
  const originalProgress = await getProgress(api, token);

  const summary = {
    movie: MOVIE.title,
    originalProgress,
    mediaInfo: null,
    uiSearch: false,
    openedDrivePlayer: false,
    initialPlayback: null,
    forwardSeek: null,
    subtitlesOff: null,
    subtitlesOn: null,
    audioSwitch: null,
    streamResponses: [],
    consoleErrors: [],
    requestFailures: [],
  };

  page.on('console', (msg) => {
    if (['error'].includes(msg.type())) {
      summary.consoleErrors.push(msg.text());
    }
  });
  page.on('requestfailed', (req) => {
    summary.requestFailures.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText,
    });
  });
  page.on('response', async (res) => {
    if (res.url().includes(`/api/sources/drive/${MOVIE.driveFileId}/stream`)) {
      summary.streamResponses.push({
        status: res.status(),
        url: res.url(),
        contentRange: res.headers()['content-range'] || null,
        contentType: res.headers()['content-type'] || null,
        buffer: res.headers()['x-buffer-chunk-size'] || null,
      });
    }
  });

  try {
    const mediaInfoRes = await api.get(`/sources/drive/${MOVIE.driveFileId}/media-info`);
    summary.mediaInfo = await mediaInfoRes.json();
    expect(summary.mediaInfo?.data?.audioTracks?.length, 'audio tracks').toBeGreaterThanOrEqual(2);
    expect(summary.mediaInfo?.data?.subtitleTracks?.length, 'subtitle tracks').toBeGreaterThanOrEqual(1);

    await setProgress(api, token, 0, false);

    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email Address').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });

    await page.goto(`${BASE_URL}/movies`, { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Filter titles, directors, cast...').fill(MOVIE.title);
    await page.waitForResponse((res) => res.url().includes('/api/movies') && res.url().includes(`search=${MOVIE.title}`), { timeout: 30000 });
    await page.getByText(MOVIE.title, { exact: true }).first().waitFor({ timeout: 30000 });
    summary.uiSearch = true;

    await page.getByText(MOVIE.title, { exact: true }).first().click();
    await page.waitForURL(new RegExp(`/movies/${MOVIE.id}`), { timeout: 30000 });
    await page.getByText('GOOGLE DRIVE', { exact: false }).first().waitFor({ timeout: 30000 });

    const playButtons = page.getByRole('button', { name: /^(Play|Resume)$/ });
    await playButtons.last().scrollIntoViewIfNeeded();
    await playButtons.last().click();
    await page.getByRole('dialog').waitFor({ timeout: 30000 });
    summary.openedDrivePlayer = true;

    await waitForVideoReady(page, 'initial stream');
    await page.locator('video').first().evaluate(async (video) => {
      video.muted = true;
      await video.play();
    });
    await sleep(3500);
    const afterPlay = await getVideoState(page);
    expect(afterPlay.error, 'video error after play').toBeNull();
    expect(afterPlay.currentTime, 'playback currentTime').toBeGreaterThan(0.5);
    summary.initialPlayback = afterPlay;

    await page.mouse.move(720, 500);
    const beforeForward = afterPlay.currentTime;
    await page.keyboard.press('ArrowRight');
    await sleep(1500);
    const afterForward = await getVideoState(page);
    expect(afterForward.currentTime, 'forward seek currentTime').toBeGreaterThan(beforeForward + 8);
    summary.forwardSeek = { before: beforeForward, after: afterForward.currentTime };

    const subtitlesButton = page.getByRole('button', { name: /Subtitles:/ }).first();
    await subtitlesButton.waitFor({ timeout: 45000 });
    await subtitlesButton.click();
    await page.getByText('Off (Disable Subtitles)').click();
    await page.getByRole('button', { name: /Subtitles: Off/ }).waitFor({ timeout: 10000 });
    summary.subtitlesOff = await getVideoState(page);
    expect(summary.subtitlesOff.textTracks.every((track) => track.mode === 'disabled'), 'all subtitles disabled').toBeTruthy();

    await page.getByRole('button', { name: /Subtitles: Off/ }).click();
    await page.getByRole('menuitem').filter({ hasText: /1TamilMV|Subtitle|Subtitles/i }).last().click();
    await sleep(1000);
    summary.subtitlesOn = await getVideoState(page);
    expect(
      summary.subtitlesOn.textTracks.some((track) => track.mode === 'showing' || track.mode === 'hidden'),
      'subtitle track active',
    ).toBeTruthy();

    const audioButton = page.getByRole('button', { name: /Audio:/ }).first();
    await audioButton.waitFor({ timeout: 45000 });
    await audioButton.click();
    await page.getByRole('menuitem').filter({ hasText: /1TamilMV|Audio Track/i }).nth(1).click();
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return Boolean(video?.currentSrc.includes('audioIndex=1') && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !video.error);
    }, { timeout: 90000 });
    await sleep(2000);
    summary.audioSwitch = await getVideoState(page);
    expect(summary.audioSwitch.currentSrc, 'audio switch source').toContain('audioIndex=1');

    await page.screenshot({ path: '.playwright-mcp/streaming-smoke-final.png', fullPage: false });
    await writeFile('.playwright-mcp/streaming-smoke-summary.json', JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await setProgress(
      api,
      token,
      originalProgress?.last_played_position_sec || 0,
      Boolean(originalProgress?.completed),
    );
    await api.dispose();
  }
});
