import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

/**
 * Creates a Drizzle client backed by a pg Pool.
 * Used by the Nest DbModule provider and by standalone scripts (seed).
 */
export function createDb(databaseUrl: string): { db: Database; pool: pg.Pool } {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
