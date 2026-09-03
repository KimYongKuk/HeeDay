/**
 * Visual smoke test against a running server.
 * Usage: pnpm smoke [outDir]
 *   SMOKE_BASE=https://heeday.netlify.app  -> target another host (default http://localhost:3000)
 *   SMOKE_MOBILE=1                          -> 390×844 phone viewport instead of 1440×900
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const MOBILE = process.env.SMOKE_MOBILE === '1';
const OUT = process.argv[2] ?? path.join(process.cwd(), '.smoke');

const PAGES: { name: string; path: string }[] = [
  { name: 'calendar-month', path: '/calendar?date=2026-06-10' },
  { name: 'calendar-week', path: '/calendar?view=week&date=2026-06-10' },
  { name: 'calendar-timeline', path: '/calendar?view=timeline&date=2026-06-10' },
  { name: 'library', path: '/library' },
  { name: 'library-detail', path: '/library?id=12' },
  { name: 'templates', path: '/templates' },
  { name: 'template', path: '/templates/1' },
  { name: 'wizard', path: '/programs/new' },
  { name: 'closures', path: '/closures' },
  { name: 'program', path: '/programs/1' },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = MOBILE
    ? await browser.newContext({ ...devices['iPhone 13'], locale: 'ko-KR' })
    : await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'ko-KR' });
  const page = await context.newPage();
  let failures = 0;

  for (const p of PAGES) {
    const errors: string[] = [];
    const onConsole = (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === 'error') errors.push(msg.text());
    };
    const onPageError = (err: Error) => errors.push(`pageerror: ${err.message}`);
    page.on('console', onConsole);
    page.on('pageerror', onPageError);

    const res = await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const file = path.join(OUT, `${p.name}${MOBILE ? '-mobile' : ''}.png`);
    await page.screenshot({ path: file, fullPage: MOBILE });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    page.off('console', onConsole);
    page.off('pageerror', onPageError);

    const status = res?.status() ?? 0;
    const bad = status !== 200 || errors.length > 0 || overflow > 0;
    if (bad) failures += 1;
    console.log(`${bad ? 'FAIL' : ' ok '} ${p.name.padEnd(18)} ${status} ${errors.length} console errors${overflow > 0 ? ` · horizontal overflow ${overflow}px` : ''} -> ${file}`);
    for (const e of errors.slice(0, 5)) console.log(`      ${e.slice(0, 300)}`);
  }

  await browser.close();
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
