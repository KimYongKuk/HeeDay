import { config } from 'dotenv';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { getDb, getPool } from '@/lib/db/client';

config({ path: '.env.local' });
config();

async function main() {
  await migrate(getDb(), { migrationsFolder: './drizzle' });
  console.log('migrations applied');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => getPool().end());
