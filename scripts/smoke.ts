/**
 * Visual smoke test against a running dev server (pnpm dev).
 * Usage: pnpm smoke [outDir]   -> screenshots + console errors per page
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';
const OUT = process.argv[2] ?? path.join(process.cwd(), '.smoke');

const PAGES: { name: string; path: string; actions?: string[] }[] = [
  { name: 'calendar-month', path: '/calendar?date=2026-06-10' },
  { name: 'calendar-week', path: '/calendar?view=week&date=2026-06-10' },
  { name: 'calendar-timeline', path: '/calendar?view=timeline&date=2026-06-10' },
  { name: 'library', path: '/library' },
  { name: 'template', path: '/templates/1' },
  { name: 'wizard', path: '/programs/new' },
  { name: 'closures', path: '/closures' },
  { name: 'program', path: '/programs/1' },
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
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
    const file = path.join(OUT, `${p.name}.png`);
    await page.screenshot({ path: file });

    page.off('console', onConsole);
    page.off('pageerror', onPageError);

    const status = res?.status() ?? 0;
    const bad = status !== 200 || errors.length > 0;
    if (bad) failures += 1;
    console.log(`${bad ? 'FAIL' : ' ok '} ${p.name.padEnd(18)} ${status} ${errors.length} console errors -> ${file}`);
    for (const e of errors.slice(0, 5)) console.log(`      ${e.slice(0, 300)}`);
  }

  await browser.close();
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
