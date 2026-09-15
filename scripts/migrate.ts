import { config } from 'dotenv';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { getDb, getPool } from '@/lib/db/client';

config({ path: '.env.local' });
config();

/**
 * `pnpm db:migrate` targets DATABASE_URL (local). `pnpm db:migrate --prod` swaps in
 * PROD_DATABASE_URL from the same .env.local with TLS on, so the production URL never
 * sits in the variable the app itself reads.
 */
const prod = process.argv.includes('--prod');
if (prod) {
  const url = process.env.PROD_DATABASE_URL;
  if (!url) throw new Error('PROD_DATABASE_URL is not set in .env.local');
  process.env.DATABASE_URL = url;
  process.env.DATABASE_SSL = '1';
}

async function main() {
  const host = new URL(process.env.DATABASE_URL ?? '').host || '(unknown host)';
  console.log(`target: ${prod ? 'production' : 'local'} (${host})`);
  await migrate(getDb(), { migrationsFolder: './drizzle' });
  console.log('migrations applied');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
