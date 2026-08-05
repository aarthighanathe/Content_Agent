import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema.js';
import { env } from '../config.js';

// WHY neon-serverless (WebSocket Pool) instead of neon-http: the HTTP driver
// executes each statement as its own request and has no transaction support
// (db.transaction() throws "No transactions support in neon-http driver").
// persistJobToDB() relies on a real transaction across contentJobs/contentOutputs/
// agentLogs, so this project must use the WebSocket-based Pool driver instead.
let _db: ReturnType<typeof drizzle<typeof schema>> | null | undefined;

function initDb() {
  if (_db !== undefined) return _db;
  _db = drizzle(new Pool({ connectionString: env.DATABASE_URL }), { schema });
  return _db;
}

// db behaves like the drizzle instance but initializes on first property access.
// WHY Reflect.get/Reflect.has instead of `(instance as any)[prop]`/`prop in
// (instance as any)`: prop here is PropertyKey (string | symbol) from the Proxy
// trap signature, not a known key of the drizzle instance — TypeScript can't
// verify an arbitrary PropertyKey indexes into a specific object shape without
// either an `any` escape hatch or Reflect's own already-correctly-typed
// (target: object, propertyKey: PropertyKey) signature, which is exactly this
// situation (dynamic forwarding to an arbitrary target object) and needs no cast.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    const instance = initDb();
    if (!instance) return undefined;
    return Reflect.get(instance, prop);
  },
  has(_, prop) {
    const instance = initDb();
    return instance !== null && Reflect.has(instance, prop);
  },
}) as ReturnType<typeof drizzle<typeof schema>> | null;

export function getDb() {
  const instance = initDb();
  if (!instance) {
    throw new Error('Database not configured. Set DATABASE_URL environment variable.');
  }
  return instance;
}
