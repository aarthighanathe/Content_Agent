import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema.js';
import { env } from '../config.js';
import { logger } from '../lib/logger.js';

// WHY neon-serverless (WebSocket Pool) instead of neon-http: the HTTP driver
// executes each statement as its own request and has no transaction support
// (db.transaction() throws "No transactions support in neon-http driver").
// persistJobToDB() relies on a real transaction across contentJobs/contentOutputs/
// agentLogs, so this project must use the WebSocket-based Pool driver instead.
type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbInstance | null | undefined;
let _pool: Pool | null = null;

function initDb(): DbInstance | null {
  if (_db !== undefined) return _db;
  try {
    // WHY try/catch: a malformed DATABASE_URL (or Pool constructor failure) must
    // leave `db` as null so `if (db)` / `if (!db)` branches work — the old Proxy
    // wrapper was always truthy, so every "DB unavailable" path was dead code.
    //
    // WHY idleTimeoutMillis 20s: Neon closes idle WebSockets aggressively (esp.
    // free-tier scale-to-zero). Keeping the pool's idle timeout short means we
    // retire clients before the proxy does, which cuts idleListener noise.
    _pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 20_000,
    });

    // SECURITY/stability: pg.Pool emits 'error' when an *idle* client dies
    // (Neon proxy drop, network blip). With no listener, Node treats that as an
    // uncaught exception and kills the process — the crash you see as
    // `Error: Unhandled error. ()` from idleListener. Logging + discarding is
    // enough; the pool removes the dead client and opens a fresh one on next use.
    _pool.on('error', (err: Error) => {
      logger.warn('[DB] Idle client disconnected (pool discarded it)', {
        message: err.message || String(err),
        name: err.name,
      });
    });

    _db = drizzle(_pool, { schema });
  } catch (err) {
    logger.error('[DB] Failed to initialize', {
      message: err instanceof Error ? err.message : String(err),
    });
    _pool = null;
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

/** Close the WebSocket pool during graceful shutdown. */
export async function closeDb(): Promise<void> {
  if (!_pool) return;
  const pool = _pool;
  _pool = null;
  _db = null;
  try {
    await pool.end();
  } catch (err) {
    logger.warn('[DB] Error while closing pool', {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
