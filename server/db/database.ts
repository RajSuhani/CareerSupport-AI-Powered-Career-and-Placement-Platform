import type { IDatabase } from './types.ts';
import { PostgresDatabase } from './postgres.ts';
import { JsonDatabaseAdapter } from './jsonAdapter.ts';

// Re-export all model types for full backward compatibility across the application
export * from './types.ts';

/**
 * Determines whether persistent PostgreSQL (Cloud SQL) is configured via environment variables.
 */
export function isPostgresConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
    process.env.PGHOST ||
    process.env.CLOUD_SQL_CONNECTION_NAME ||
    process.env.INSTANCE_UNIX_SOCKET ||
    process.env.USE_POSTGRES === 'true'
  );
}

let activeDatabase: IDatabase | null = null;
let isInitialized = false;
let dbInitPromise: Promise<IDatabase> | null = null;
let dbInitError: Error | null = null;

/**
 * Factory creating the active database implementation based on runtime configuration.
 */
export function createDatabase(): IDatabase {
  if (isPostgresConfigured()) {
    console.log('[Database] PostgreSQL configuration detected. Connecting to PostgreSQL/Cloud SQL...');
    return new PostgresDatabase();
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    console.warn(
      '[Database Warning] Running in production without DATABASE_URL or Cloud SQL configuration! ' +
      'Data stored in local JSON file is ephemeral and WILL BE LOST when Cloud Run containers restart or scale out. ' +
      'Please provision Cloud SQL for PostgreSQL and configure DATABASE_URL in Cloud Run secrets.'
    );
  } else {
    console.log('[Database] Initialized in local JSON storage mode (data/careersupport_db.json).');
  }

  return new JsonDatabaseAdapter();
}

/**
 * Ensures an active database instance exists (lazy instantiation if not explicitly set).
 */
export function getOrCreateActiveDatabase(): IDatabase {
  if (!activeDatabase) {
    activeDatabase = createDatabase();
  }
  return activeDatabase;
}

/**
 * Explicitly initializes the database and ensures schema readiness.
 * MUST be awaited before starting the HTTP server in production and development.
 * If PostgreSQL is configured and initialization fails, startup aborts immediately
 * with a fatal error instead of silently falling back to ephemeral JSON storage.
 */
export async function initDatabase(): Promise<IDatabase> {
  const currentDb = getOrCreateActiveDatabase();

  if (isInitialized) {
    return currentDb;
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    try {
      await currentDb.init();
      isInitialized = true;
      dbInitError = null;
      return currentDb;
    } catch (err: any) {
      dbInitError = err;
      if (isPostgresConfigured()) {
        console.error(
          `[Database Fatal Error] Failed to connect to or initialize PostgreSQL database: ${err.message}\n` +
          'Refusing to silently fall back to local JSON storage in PostgreSQL mode. Startup aborted.'
        );
      } else {
        console.error(`[Database Fatal Error] Failed to initialize storage: ${err.message}`);
      }
      throw err;
    } finally {
      dbInitPromise = null;
    }
  })();

  return dbInitPromise;
}

/**
 * Check whether database initialization has succeeded and tables are ready.
 */
export function isDatabaseReady(): boolean {
  return isInitialized;
}

/**
 * Returns any error that occurred during database initialization, if any.
 */
export function getDatabaseInitializationError(): Error | null {
  return dbInitError;
}

/**
 * Returns the current database type ('postgres' or 'json').
 */
export function getDatabaseType(): 'postgres' | 'json' {
  return isPostgresConfigured() ? 'postgres' : 'json';
}

/**
 * Primary database singleton instance.
 * Transparent proxy delegating to whichever active database is configured.
 */
export const db: IDatabase = new Proxy({} as IDatabase, {
  get(_target, prop) {
    const instance = getOrCreateActiveDatabase();
    const val = (instance as any)[prop];
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  },
});

/**
 * Allows test suites to swap in a mock, in-memory, or custom database instance.
 */
export function setDatabase(customDb: IDatabase): void {
  activeDatabase = customDb;
  isInitialized = true;
  dbInitError = null;
  dbInitPromise = null;
}

/**
 * Retrieves the currently active database instance.
 */
export function getDatabase(): IDatabase {
  return getOrCreateActiveDatabase();
}

/**
 * Resets database state (used for testing initialization and recovery scenarios).
 */
export function resetDatabase(): void {
  activeDatabase = null;
  isInitialized = false;
  dbInitError = null;
  dbInitPromise = null;
}
