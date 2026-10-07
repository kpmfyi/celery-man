import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Optional documentation tooling. The shipped app does not depend on Playwright.
const root = fileURLToPath(new URL('../', import.meta.url));
let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Install the optional capture tool first:\n  npm install --no-save --package-lock=false playwright@1.61.1\n  npx playwright install chromium');
  process.exit(1);
}

const marker = /<!-- screenshots:start -->[\s\S]*?<!-- screenshots:end -->/;
const readmePath = path.join(root, 'README.md');
const readme = await fs.readFile(readmePath, 'utf8');
if (!marker.test(readme)) throw new Error('README screenshot markers are missing.');
execFileSync(process.execPath, [path.join(root, 'scripts/build-standalone.mjs')], { stdio: 'inherit' });
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'celery-screenshots-'));
let browser;
try {
  browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC',
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(root, 'celery-man.html')).href);
  await page.locator('#room-loading').waitFor({ state: 'hidden' });
  if (await page.locator('#webgl-fallback').isVisible()) throw new Error('Chromium could not initialize WebGL.');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Object.values(globalThis.__CELERY_MEDIA__)
      .filter(src => src.startsWith('data:image/'))
      .map(src => { const image = new Image(); image.src = src; return image.decode(); }));
  });
  const settle = async () => {
    await page.waitForFunction(() => !document.body.classList.contains('moving')
      && !document.querySelector('#stage').classList.contains('loading')
      && !document.querySelector('#computer-screen').dataset.effect
      && document.querySelector('#response').getAttribute('aria-busy') !== 'true');
    await page.mouse.move(0, 0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const capture = async name => {
    await settle();
    await page.screenshot({ path: path.join(temporary, name), animations: 'disabled' });
  };
  await capture('blue-room.png');
  await page.locator('#sit-button').click();
  await page.waitForFunction(() => document.body.classList.contains('seated'));
  await page.locator('#start').click();
  await page.locator('#boot').waitFor({ state: 'hidden' });
  await capture('computer.png');
  await page.locator('[data-sequence="tayne"]').click();
  await settle();
  await page.locator('#dimensions').click();
  await page.locator('#four-d-windows .extra-window').first().waitFor({ state: 'visible' });
  await capture('4d3d3d3.png');
  if (errors.length) throw new Error(`The app reported errors: ${errors.join('; ')}`);

  const output = path.join(root, 'docs/screenshots');
  await fs.mkdir(output, { recursive: true });
  for (const name of ['blue-room.png', 'computer.png', '4d3d3d3.png']) {
    await fs.copyFile(path.join(temporary, name), path.join(output, name));
  }
  const gallery = `<!-- screenshots:start -->
[![Celery Man dancing on the CINCO desktop inside the 3D monitor](docs/screenshots/computer.png)](https://celeryman.vaporware.gripe/)

| Take a seat. | Kick up the 4D3D3D3. |
| --- | --- |
| ![The blue room and its waiting computer](docs/screenshots/blue-room.png) | ![Tayne in multiple overlapping CINCO windows](docs/screenshots/4d3d3d3.png) |

*Actual app captures. Original performance excerpts: Adult Swim / Tim & Eric.*
<!-- screenshots:end -->`;
  await fs.writeFile(readmePath, readme.replace(marker, gallery));
  console.log('Saved three screenshots to docs/screenshots/ and updated the README gallery.');
} finally {
  try { await browser?.close(); }
  finally { await fs.rm(temporary, { recursive: true, force: true }); }
}
