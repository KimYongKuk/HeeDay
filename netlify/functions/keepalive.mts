/**
 * Netlify Scheduled Function: keeps the Next.js server handler and the TiDB Serverless
 * cluster warm during office hours so the first staff visit of the day is not a cold start.
 *
 * Runs only on the production deploy. Cron is UTC: 22:00–23:59 and 00:00–10:59 = KST 07:00–19:59.
 * Weekends are skipped inside the function (a cron day-of-week filter would need two
 * expressions because the KST day boundary sits in the middle of the UTC window).
 *
 * Cost (free tier): every 15 min × 13 h × ~22 weekdays ≈ 1,150 runs/month, each triggering
 * one /api/health invocation → ~2,300 invocations/month of the 125k allowance.
 * Tighten to every 10 min only if the logged dbMs shows TiDB still going cold between pings.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function isWeekendInKst(now: Date): boolean {
  const day = new Date(now.getTime() + KST_OFFSET_MS).getUTCDay();
  return day === 0 || day === 6;
}

async function keepalive(): Promise<void> {
  if (isWeekendInKst(new Date())) return;

  const base = process.env.URL;
  if (!base)
    throw new Error('URL is not set; keepalive needs the site URL Netlify injects at runtime');

  const startedAt = Date.now();
  const res = await fetch(`${base}/api/health?source=keepalive`, {
    signal: AbortSignal.timeout(25_000),
    headers: { 'user-agent': 'heeday-keepalive' },
  });
  const body = (await res.json().catch(() => null)) as { latencyMs?: number } | null;

  // One JSON line per run; read it in Netlify → Logs → Functions → keepalive.
  // totalMs spiking past ~5s means a cold start leaked; dbMs growing points at TiDB.
  console.log(
    JSON.stringify({
      keepalive: true,
      status: res.status,
      totalMs: Date.now() - startedAt,
      dbMs: body?.latencyMs ?? null,
    }),
  );

  if (!res.ok) throw new Error(`keepalive: /api/health responded ${res.status}`);
}

export default keepalive;

export const config = { schedule: '*/15 22-23,0-10 * * *' };
