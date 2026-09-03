import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

function describe(err: unknown): { code: string; message: string } {
  const e = err as { code?: string; message?: string };
  // mysql2/driver errors never include the connection string; keep the message but cap its length.
  return { code: e?.code ?? 'UNKNOWN', message: (e?.message ?? String(err)).slice(0, 300) };
}

export async function GET() {
  const startedAt = Date.now();
  const configured = Boolean(process.env.DATABASE_URL);
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: 'up', latencyMs: Date.now() - startedAt, time: new Date().toISOString() });
  } catch (err) {
    console.error('health check failed', err);
    return NextResponse.json(
      { ok: false, db: 'down', configured, ssl: process.env.DATABASE_SSL ?? null, error: describe(err), time: new Date().toISOString() },
      { status: 503 },
    );
  }
}
