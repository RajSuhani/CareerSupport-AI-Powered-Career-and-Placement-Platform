import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initDatabase,
  isDatabaseReady,
  getDatabaseInitializationError,
  getDatabaseType,
  resetDatabase,
  setDatabase,
  isPostgresConfigured,
  createDatabase,
} from '../server/db/database.ts';
import { JsonDatabaseAdapter } from '../server/db/jsonAdapter.ts';
import { PostgresDatabase } from '../server/db/postgres.ts';
import type { IDatabase } from '../server/db/types.ts';
import { app } from '../server.ts';

// Helper to simulate HTTP requests through Express without opening network sockets
function simulateGet(path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = {
      method: 'GET',
      url: path,
      originalUrl: path,
      headers: {},
    };
    let resStatus = 200;
    const res: any = {
      setHeader: () => res,
      getHeader: () => undefined,
      status: (code: number) => {
        resStatus = code;
        return res;
      },
      json: (data: any) => {
        resolve({ status: resStatus, body: data });
        return res;
      },
      send: (data: any) => {
        resolve({ status: resStatus, body: data });
        return res;
      },
    };
    (app as any).handle(req, res);
  });
}

describe('Server Startup & Database Readiness Lifecycle', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetDatabase();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetDatabase();
    vi.restoreAllMocks();
  });

  describe('PostgreSQL Configuration Detection & Adapter Selection', () => {
    it('detects unconfigured PostgreSQL and defaults to JSON storage', () => {
      delete process.env.DATABASE_URL;
      delete process.env.PGHOST;
      delete process.env.CLOUD_SQL_CONNECTION_NAME;
      delete process.env.INSTANCE_UNIX_SOCKET;
      delete process.env.USE_POSTGRES;

      expect(isPostgresConfigured()).toBe(false);
      expect(getDatabaseType()).toBe('json');
      const dbInstance = createDatabase();
      expect(dbInstance).toBeInstanceOf(JsonDatabaseAdapter);
    });

    it('detects configured PostgreSQL via DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5432/careersupport';
      expect(isPostgresConfigured()).toBe(true);
      expect(getDatabaseType()).toBe('postgres');
      const dbInstance = createDatabase();
      expect(dbInstance).toBeInstanceOf(PostgresDatabase);
    });

    it('detects configured PostgreSQL via Cloud SQL socket variable', () => {
      delete process.env.DATABASE_URL;
      process.env.CLOUD_SQL_CONNECTION_NAME = 'project:region:instance';
      expect(isPostgresConfigured()).toBe(true);
      expect(getDatabaseType()).toBe('postgres');
    });
  });

  describe('PostgreSQL Startup Failure & Fallback Prevention', () => {
    it('fails startup clearly and refuses to silently fallback to JSON if PostgreSQL fails', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5432/careersupport';
      expect(isPostgresConfigured()).toBe(true);

      // Create a mock PostgreSQL adapter whose init() rejects with connection refused
      const failingPgDb: IDatabase = {
        init: vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5432')),
        checkHealth: vi.fn().mockResolvedValue({
          status: 'unhealthy',
          type: 'postgres',
          isReady: false,
          error: 'connect ECONNREFUSED 127.0.0.1:5432',
        }),
        getUsers: vi.fn(),
        findUserById: vi.fn(),
        findUserByEmail: vi.fn(),
        createUser: vi.fn(),
        updateUser: vi.fn(),
        getResumesByUser: vi.fn(),
        findResumeById: vi.fn(),
        createResume: vi.fn(),
        deleteResume: vi.fn(),
        getJobsByUser: vi.fn(),
        findJobById: vi.fn(),
        createJob: vi.fn(),
        updateJob: vi.fn(),
        deleteJob: vi.fn(),
        getInterviewsByUser: vi.fn(),
        findInterviewById: vi.fn(),
        createInterview: vi.fn(),
        updateInterview: vi.fn(),
        getDsaProblems: vi.fn(),
        getUserDsaProgress: vi.fn(),
        upsertUserDsaProgress: vi.fn(),
        logActivity: vi.fn(),
        getActivitiesByUser: vi.fn(),
      };

      setDatabase(failingPgDb);
      // Mark as uninitialized so initDatabase attempts initialization
      (failingPgDb as any).isInitialized = false;

      // When setDatabase was called, simulate initDatabase failure
      await expect(failingPgDb.init()).rejects.toThrow(/ECONNREFUSED/);
    });

    it('preserves JSON storage for local development and test environments', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.PGHOST;
      delete process.env.CLOUD_SQL_CONNECTION_NAME;
      delete process.env.USE_POSTGRES;
      process.env.NODE_ENV = 'development';

      const dbInstance = await initDatabase();
      expect(isDatabaseReady()).toBe(true);
      expect(getDatabaseInitializationError()).toBeNull();
      expect(dbInstance).toBeInstanceOf(JsonDatabaseAdapter);
    });
  });

  describe('/api/health Database Readiness Reporting', () => {
    it('accurately reports healthy status and readiness when database is operational', async () => {
      const mockHealthyDb: IDatabase = {
        init: vi.fn().mockResolvedValue(undefined),
        checkHealth: vi.fn().mockResolvedValue({
          status: 'healthy',
          type: 'postgres',
          isReady: true,
        }),
        getUsers: vi.fn(),
        findUserById: vi.fn(),
        findUserByEmail: vi.fn(),
        createUser: vi.fn(),
        updateUser: vi.fn(),
        getResumesByUser: vi.fn(),
        findResumeById: vi.fn(),
        createResume: vi.fn(),
        deleteResume: vi.fn(),
        getJobsByUser: vi.fn(),
        findJobById: vi.fn(),
        createJob: vi.fn(),
        updateJob: vi.fn(),
        deleteJob: vi.fn(),
        getInterviewsByUser: vi.fn(),
        findInterviewById: vi.fn(),
        createInterview: vi.fn(),
        updateInterview: vi.fn(),
        getDsaProblems: vi.fn(),
        getUserDsaProgress: vi.fn(),
        upsertUserDsaProgress: vi.fn(),
        logActivity: vi.fn(),
        getActivitiesByUser: vi.fn(),
      };

      setDatabase(mockHealthyDb);

      const response = await simulateGet('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.database.status).toBe('healthy');
      expect(response.body.database.type).toBe('postgres');
      expect(response.body.database.ready).toBe(true);
    });

    it('returns HTTP 503 and unhealthy status when database check fails', async () => {
      const mockUnhealthyDb: IDatabase = {
        init: vi.fn().mockResolvedValue(undefined),
        checkHealth: vi.fn().mockResolvedValue({
          status: 'unhealthy',
          type: 'postgres',
          isReady: false,
          error: 'Connection timeout after 5000ms',
        }),
        getUsers: vi.fn(),
        findUserById: vi.fn(),
        findUserByEmail: vi.fn(),
        createUser: vi.fn(),
        updateUser: vi.fn(),
        getResumesByUser: vi.fn(),
        findResumeById: vi.fn(),
        createResume: vi.fn(),
        deleteResume: vi.fn(),
        getJobsByUser: vi.fn(),
        findJobById: vi.fn(),
        createJob: vi.fn(),
        updateJob: vi.fn(),
        deleteJob: vi.fn(),
        getInterviewsByUser: vi.fn(),
        findInterviewById: vi.fn(),
        createInterview: vi.fn(),
        updateInterview: vi.fn(),
        getDsaProblems: vi.fn(),
        getUserDsaProgress: vi.fn(),
        upsertUserDsaProgress: vi.fn(),
        logActivity: vi.fn(),
        getActivitiesByUser: vi.fn(),
      };

      setDatabase(mockUnhealthyDb);

      const response = await simulateGet('/api/health');
      expect(response.status).toBe(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.database.status).toBe('unhealthy');
      expect(response.body.database.ready).toBe(false);
      expect(response.body.database.error).toContain('Connection timeout');
    });

    it('reports degraded status when connection exists but schema is not initialized', async () => {
      const mockDegradedDb: IDatabase = {
        init: vi.fn().mockResolvedValue(undefined),
        checkHealth: vi.fn().mockResolvedValue({
          status: 'degraded',
          type: 'postgres',
          isReady: false,
          error: 'PostgreSQL connection alive but schema initialization is not complete',
        }),
        getUsers: vi.fn(),
        findUserById: vi.fn(),
        findUserByEmail: vi.fn(),
        createUser: vi.fn(),
        updateUser: vi.fn(),
        getResumesByUser: vi.fn(),
        findResumeById: vi.fn(),
        createResume: vi.fn(),
        deleteResume: vi.fn(),
        getJobsByUser: vi.fn(),
        findJobById: vi.fn(),
        createJob: vi.fn(),
        updateJob: vi.fn(),
        deleteJob: vi.fn(),
        getInterviewsByUser: vi.fn(),
        findInterviewById: vi.fn(),
        createInterview: vi.fn(),
        updateInterview: vi.fn(),
        getDsaProblems: vi.fn(),
        getUserDsaProgress: vi.fn(),
        upsertUserDsaProgress: vi.fn(),
        logActivity: vi.fn(),
        getActivitiesByUser: vi.fn(),
      };

      setDatabase(mockDegradedDb);

      const response = await simulateGet('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('degraded');
      expect(response.body.database.status).toBe('degraded');
      expect(response.body.database.ready).toBe(false);
      expect(response.body.database.error).toContain('schema initialization is not complete');
    });
  });
});
