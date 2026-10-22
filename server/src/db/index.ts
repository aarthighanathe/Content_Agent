import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema.js';
import { env } from '../config.js';

// WHY neon-serverless (WebSocket Pool) instead of neon-http: the HTTP driver
// executes each statement as its own request and has no transaction support
// (db.transaction() throws "No transactions support in neon-http driver").
// persistJobToDB() relies on a real transaction across contentJobs/contentOutputs/
// agentLogs, so this project must use the WebSocket-based Pool driver instead.
type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbInstance | null | undefined;

function initDb(): DbInstance | null {
  if (_db !== undefined) return _db;
  try {
    // WHY try/catch: a malformed DATABASE_URL (or Pool constructor failure) must
    // leave `db` as null so `if (db)` / `if (!db)` branches work — the old Proxy
    // wrapper was always truthy, so every "DB unavailable" path was dead code.
    _db = drizzle(new Pool({ connectionString: env.DATABASE_URL }), { schema });
  } catch (err) {
    console.error('[DB] Failed to initialize:', err);
    _db = null;
  }
  return _db;
}

// WHY eager init (not Proxy): callers across the codebase gate on `if (db)`.
// A Proxy object is always truthy even when the backing instance is null.
export const db: DbInstance | null = initDb();

export function getDb(): DbInstance {
  const instance = initDb();
  if (!instance) {
    throw new Error('Database not configured. Set DATABASE_URL environment variable.');
  }
  return instance;
}
