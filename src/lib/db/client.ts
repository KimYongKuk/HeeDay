import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

export type Db = MySql2Database<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

const globalRef = globalThis as unknown as { __heedayPool?: mysql.Pool; __heedayDb?: Db };

function createPool(): mysql.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.');
  }
  const useSsl = process.env.DATABASE_SSL === '1' || process.env.DATABASE_SSL === 'true';
  return mysql.createPool({
    uri: url,
    // Small pool: serverless functions each get their own instance.
    connectionLimit: 3,
    waitForConnections: true,
    timezone: 'Z',
    dateStrings: true,
    ssl: useSsl ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
  });
}

export function getPool(): mysql.Pool {
  if (!globalRef.__heedayPool) globalRef.__heedayPool = createPool();
  return globalRef.__heedayPool;
}

export function getDb(): Db {
  if (!globalRef.__heedayDb) {
    globalRef.__heedayDb = drizzle(getPool(), { schema, mode: 'default' });
  }
  return globalRef.__heedayDb;
}
