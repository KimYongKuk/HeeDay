import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });
config();

export default defineConfig({
  dialect: 'mysql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'mysql://heeday:heeday@127.0.0.1:3306/heeday',
  },
  strict: true,
  verbose: true,
});
