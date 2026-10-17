import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const FPS = 30, DUR = 47.0;
const EXEC = process.env.HOME + '/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const URL = 'file:///tmp/opencode/promo/index.html';
const OUT = process.argv[2] === 'full' ? '/tmp/opencode/promo/frames' : '/tmp/opencode/promo/preview';

const times = process.argv[2] === 'full'
  ? null
  : [0.5, 1.0, 1.6, 3.6, 5.4, 8.0, 10.8, 12.5, 15.4, 17.6, 19.9, 22.0, 24.4, 26.2, 27.4, 29.6, 31.6, 34.0, 36.2, 38.6, 40.4, 41.4, 43.4, 44.8, 45.6];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox', '--force-device-scale-factor=1'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'load' });
await page.evaluate(async () => { await document.fonts.ready; });

if (times) {
  for (const t of times) {
    await page.evaluate((tt) => window.render(tt), t);
    await page.screenshot({ path: `${OUT}/t${String(t).replace('.', '_')}.png` });
  }
  console.log('PREVIEW DONE');
} else {
  const N = Math.round(DUR * FPS);
  for (let f = 0; f < N; f++) {
    await page.evaluate((tt) => window.render(tt), f / FPS);
    await page.screenshot({ path: `${OUT}/f${String(f).padStart(5, '0')}.png` });
    if (f % 300 === 0) console.log('frame', f, '/', N);
  }
  console.log('FULL DONE', N, 'frames');
}
await browser.close();
