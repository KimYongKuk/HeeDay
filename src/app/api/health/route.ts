import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startedAt = Date.now();
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: 'up', latencyMs: Date.now() - startedAt, time: new Date().toISOString() });
  } catch (err) {
    console.error('health check failed', err);
    return NextResponse.json({ ok: false, db: 'down', time: new Date().toISOString() }, { status: 503 });
  }
}
