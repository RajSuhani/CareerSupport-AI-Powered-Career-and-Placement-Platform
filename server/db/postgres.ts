import pg from 'pg';
import fs from 'fs';
import path from 'path';
import type {
  IDatabase,
  User,
  ResumeAnalysis,
  JobApplication,
  InterviewSession,
  DsaProblem,
  UserDsaProgress,
  UserActivity,
} from './types.ts';
import { DEFAULT_DSA_PROBLEMS } from './types.ts';

const { Pool } = pg;

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export function buildPostgresConfigFromEnv(): PostgresConfig {
  const connectionString = process.env.DATABASE_URL;

  // Cloud SQL Unix socket support on Cloud Run
  const cloudSqlInstance = process.env.CLOUD_SQL_CONNECTION_NAME || process.env.INSTANCE_UNIX_SOCKET;
  const host = cloudSqlInstance ? `/cloudsql/${cloudSqlInstance}` : process.env.PGHOST || '127.0.0.1';

  const isProduction = process.env.NODE_ENV === 'production';
  const sslRequired = process.env.PGSSL === 'true' || process.env.PGSSL === 'require';

  let ssl: boolean | { rejectUnauthorized: boolean } | undefined = undefined;
  if (sslRequired) {
    ssl = { rejectUnauthorized: false };
  } else if (connectionString && connectionString.includes('sslmode=require')) {
    ssl = { rejectUnauthorized: false };
  }

  if (connectionString) {
    return {
      connectionString,
      ssl,
      max: parseInt(process.env.PG_POOL_MAX || '10', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  return {
    host,
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'careersupport',
    ssl,
    max: parseInt(process.env.PG_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

export class PostgresDatabase implements IDatabase {
  private pool: pg.Pool;
  private isInitialized = false;

  constructor(config?: PostgresConfig | pg.Pool) {
    if (config instanceof Pool) {
      this.pool = config;
    } else {
      const cfg = config || buildPostgresConfigFromEnv();
      this.pool = new Pool(cfg);
    }

    this.pool.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]: Unexpected idle client error', err);
    });
  }

  public getPool(): pg.Pool {
    return this.pool;
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const client = await this.pool.connect();
      try {
        const schemaPath = path.resolve(process.cwd(), 'server/db/schema.sql');
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf-8');
          await client.query(sql);
        }

        // Seed initial curated DSA problems if table is empty
        const countRes = await client.query('SELECT COUNT(*) AS count FROM dsa_problems');
        const count = parseInt(countRes.rows[0]?.count || '0', 10);
        if (count === 0) {
          for (const prob of DEFAULT_DSA_PROBLEMS) {
            await client.query(
              `INSERT INTO dsa_problems (id, title, category, difficulty, leetcode_number, practice_url, pattern)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO NOTHING`,
              [prob.id, prob.title, prob.category, prob.difficulty, prob.leetcodeNumber || null, prob.practiceUrl, prob.pattern]
            );
          }
        }
        this.isInitialized = true;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.error('[PostgreSQL] Database initialization failed:', err.message);
      throw new Error(`Failed to initialize PostgreSQL database: ${err.message}`);
    }
  }

  public async checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; type: 'postgres'; isReady?: boolean; error?: string }> {
    try {
      const res = await this.pool.query('SELECT 1 AS alive');
      if (res.rows[0]?.alive === 1) {
        if (!this.isInitialized) {
          return {
            status: 'degraded',
            type: 'postgres',
            isReady: false,
            error: 'PostgreSQL connection alive but schema initialization is not complete',
          };
        }
        return { status: 'healthy', type: 'postgres', isReady: true };
      }
      return { status: 'degraded', type: 'postgres', isReady: false, error: 'Unexpected response from PostgreSQL' };
    } catch (err: any) {
      return { status: 'unhealthy', type: 'postgres', isReady: false, error: err.message };
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  // --- Users ---
  public async getUsers(): Promise<User[]> {
    const res = await this.pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return res.rows.map(this.mapUser);
  }

  public async findUserById(id: string): Promise<User | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] ? this.mapUser(res.rows[0]) : undefined;
  }

  public async findUserByEmail(email: string): Promise<User | undefined> {
    const res = await this.pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return res.rows[0] ? this.mapUser(res.rows[0]) : undefined;
  }

  public async createUser(user: User): Promise<User> {
    const query = `
      INSERT INTO users (id, name, email, password_hash, target_role, experience_level, skills, education, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const values = [
      user.id,
      user.name,
      user.email,
      user.passwordHash,
      user.targetRole,
      user.experienceLevel,
      JSON.stringify(user.skills || []),
      user.education || '',
      user.createdAt || new Date().toISOString(),
      user.updatedAt || new Date().toISOString(),
    ];
    const res = await this.pool.query(query, values);
    return this.mapUser(res.rows[0]);
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = await this.findUserById(id);
    if (!existing) return null;

    const merged: User = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const query = `
      UPDATE users
      SET name = $2, email = $3, password_hash = $4, target_role = $5, experience_level = $6, skills = $7, education = $8, updated_at = $9
      WHERE id = $1
      RETURNING *
    `;
    const values = [
      id,
      merged.name,
      merged.email,
      merged.passwordHash,
      merged.targetRole,
      merged.experienceLevel,
      JSON.stringify(merged.skills || []),
      merged.education,
      merged.updatedAt,
    ];
    const res = await this.pool.query(query, values);
    return res.rows[0] ? this.mapUser(res.rows[0]) : null;
  }

  // --- Resumes ---
  public async getResumesByUser(userId: string): Promise<ResumeAnalysis[]> {
    const res = await this.pool.query(
      'SELECT * FROM resume_analyses WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows.map(this.mapResume);
  }

  public async findResumeById(id: string, userId: string): Promise<ResumeAnalysis | undefined> {
    const res = await this.pool.query(
      'SELECT * FROM resume_analyses WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return res.rows[0] ? this.mapResume(res.rows[0]) : undefined;
  }

  public async createResume(resume: ResumeAnalysis): Promise<ResumeAnalysis> {
    const query = `
      INSERT INTO resume_analyses (
        id, user_id, file_name, target_job_role, target_job_description, match_score, ats_score,
        identified_skills, missing_skills, strengths, weaknesses, suggested_improvements,
        keyword_recommendations, summary, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;
    const values = [
      resume.id,
      resume.userId,
      resume.fileName,
      resume.targetJobRole,
      resume.targetJobDescription,
      resume.matchScore,
      resume.atsScore,
      JSON.stringify(resume.identifiedSkills || []),
      JSON.stringify(resume.missingSkills || []),
      JSON.stringify(resume.strengths || []),
      JSON.stringify(resume.weaknesses || []),
      JSON.stringify(resume.suggestedImprovements || []),
      JSON.stringify(resume.keywordRecommendations || []),
      resume.summary,
      resume.createdAt || new Date().toISOString(),
    ];
    const res = await this.pool.query(query, values);
    return this.mapResume(res.rows[0]);
  }

  public async deleteResume(id: string, userId: string): Promise<boolean> {
    const res = await this.pool.query(
      'DELETE FROM resume_analyses WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Jobs ---
  public async getJobsByUser(userId: string): Promise<JobApplication[]> {
    const res = await this.pool.query(
      'SELECT * FROM job_applications WHERE user_id = $1 ORDER BY COALESCE(updated_at, created_at) DESC',
      [userId]
    );
    return res.rows.map(this.mapJob);
  }

  public async findJobById(id: string, userId: string): Promise<JobApplication | undefined> {
    const res = await this.pool.query(
      'SELECT * FROM job_applications WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return res.rows[0] ? this.mapJob(res.rows[0]) : undefined;
  }

  public async createJob(job: JobApplication): Promise<JobApplication> {
    const query = `
      INSERT INTO job_applications (
        id, user_id, company, role, posting_url, location, status,
        application_date, salary, notes, follow_up_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [
      job.id,
      job.userId,
      job.company,
      job.role,
      job.postingUrl || null,
      job.location,
      job.status,
      job.applicationDate,
      job.salary || null,
      job.notes || null,
      job.followUpDate || null,
      job.createdAt || new Date().toISOString(),
      job.updatedAt || new Date().toISOString(),
    ];
    const res = await this.pool.query(query, values);
    return this.mapJob(res.rows[0]);
  }

  public async updateJob(id: string, userId: string, updates: Partial<JobApplication>): Promise<JobApplication | null> {
    const existing = await this.findJobById(id, userId);
    if (!existing) return null;

    const merged: JobApplication = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const query = `
      UPDATE job_applications
      SET company = $3, role = $4, posting_url = $5, location = $6, status = $7,
          application_date = $8, salary = $9, notes = $10, follow_up_date = $11, updated_at = $12
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const values = [
      id,
      userId,
      merged.company,
      merged.role,
      merged.postingUrl || null,
      merged.location,
      merged.status,
      merged.applicationDate,
      merged.salary || null,
      merged.notes || null,
      merged.followUpDate || null,
      merged.updatedAt,
    ];
    const res = await this.pool.query(query, values);
    return res.rows[0] ? this.mapJob(res.rows[0]) : null;
  }

  public async deleteJob(id: string, userId: string): Promise<boolean> {
    const res = await this.pool.query(
      'DELETE FROM job_applications WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // --- Interviews ---
  public async getInterviewsByUser(userId: string): Promise<InterviewSession[]> {
    const res = await this.pool.query(
      'SELECT * FROM interview_sessions WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return res.rows.map(this.mapInterview);
  }

  public async findInterviewById(id: string, userId: string): Promise<InterviewSession | undefined> {
    const res = await this.pool.query(
      'SELECT * FROM interview_sessions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return res.rows[0] ? this.mapInterview(res.rows[0]) : undefined;
  }

  public async createInterview(interview: InterviewSession): Promise<InterviewSession> {
    const query = `
      INSERT INTO interview_sessions (
        id, user_id, target_role, experience_level, category, difficulty,
        questions_count, status, questions, overall_score, overall_summary, created_at, completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;
    const values = [
      interview.id,
      interview.userId,
      interview.targetRole,
      interview.experienceLevel,
      interview.category,
      interview.difficulty,
      interview.questionsCount,
      interview.status,
      JSON.stringify(interview.questions || []),
      interview.overallScore ?? null,
      interview.overallSummary ?? null,
      interview.createdAt || new Date().toISOString(),
      interview.completedAt ?? null,
    ];
    const res = await this.pool.query(query, values);
    return this.mapInterview(res.rows[0]);
  }

  public async updateInterview(
    id: string,
    userId: string,
    updates: Partial<InterviewSession>
  ): Promise<InterviewSession | null> {
    const existing = await this.findInterviewById(id, userId);
    if (!existing) return null;

    const merged: InterviewSession = {
      ...existing,
      ...updates,
    };

    const query = `
      UPDATE interview_sessions
      SET target_role = $3, experience_level = $4, category = $5, difficulty = $6,
          questions_count = $7, status = $8, questions = $9, overall_score = $10,
          overall_summary = $11, completed_at = $12
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const values = [
      id,
      userId,
      merged.targetRole,
      merged.experienceLevel,
      merged.category,
      merged.difficulty,
      merged.questionsCount,
      merged.status,
      JSON.stringify(merged.questions || []),
      merged.overallScore ?? null,
      merged.overallSummary ?? null,
      merged.completedAt ?? null,
    ];
    const res = await this.pool.query(query, values);
    return res.rows[0] ? this.mapInterview(res.rows[0]) : null;
  }

  // --- DSA ---
  public async getDsaProblems(): Promise<DsaProblem[]> {
    const res = await this.pool.query('SELECT * FROM dsa_problems ORDER BY id ASC');
    if (res.rows.length === 0) {
      return DEFAULT_DSA_PROBLEMS;
    }
    return res.rows.map(this.mapDsaProblem);
  }

  public async getUserDsaProgress(userId: string): Promise<UserDsaProgress[]> {
    const res = await this.pool.query(
      'SELECT * FROM user_dsa_progress WHERE user_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    return res.rows.map(this.mapDsaProgress);
  }

  public async upsertUserDsaProgress(
    userId: string,
    problemId: string,
    updates: Partial<Omit<UserDsaProgress, 'id' | 'userId' | 'problemId'>>
  ): Promise<UserDsaProgress> {
    const now = new Date().toISOString();
    const newId = `prog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const query = `
      INSERT INTO user_dsa_progress (id, user_id, problem_id, status, notes, is_bookmarked, solved_at, last_revised_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, problem_id) DO UPDATE SET
        status = COALESCE(EXCLUDED.status, user_dsa_progress.status),
        notes = COALESCE(EXCLUDED.notes, user_dsa_progress.notes),
        is_bookmarked = COALESCE(EXCLUDED.is_bookmarked, user_dsa_progress.is_bookmarked),
        solved_at = CASE WHEN EXCLUDED.status = 'Solved' THEN EXCLUDED.solved_at ELSE user_dsa_progress.solved_at END,
        last_revised_at = COALESCE(EXCLUDED.last_revised_at, user_dsa_progress.last_revised_at),
        updated_at = EXCLUDED.updated_at
      RETURNING *
    `;

    const values = [
      newId,
      userId,
      problemId,
      updates.status || 'Not Started',
      updates.notes ?? '',
      updates.isBookmarked ?? false,
      updates.status === 'Solved' ? now : null,
      updates.lastRevisedAt ?? null,
      now,
    ];

    const res = await this.pool.query(query, values);
    return this.mapDsaProgress(res.rows[0]);
  }

  // --- Activities ---
  public async logActivity(activity: {
    userId: string;
    action: UserActivity['action'];
    title: string;
    description: string;
    type: UserActivity['type'];
    metadata?: Record<string, any>;
    timestamp?: string;
  }): Promise<UserActivity> {
    const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = activity.timestamp || new Date().toISOString();

    const query = `
      INSERT INTO user_activities (id, user_id, action, title, description, type, metadata, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      id,
      activity.userId,
      activity.action,
      activity.title,
      activity.description,
      activity.type,
      activity.metadata ? JSON.stringify(activity.metadata) : null,
      timestamp,
    ];

    const res = await this.pool.query(query, values);
    return this.mapActivity(res.rows[0]);
  }

  public async getActivitiesByUser(userId: string, limit: number = 30): Promise<UserActivity[]> {
    const res = await this.pool.query(
      'SELECT * FROM user_activities WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2',
      [userId, limit]
    );
    return res.rows.map(this.mapActivity);
  }

  // --- Mappers from SQL snake_case to Domain camelCase ---
  private mapUser(row: any): User {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.password_hash,
      targetRole: row.target_role,
      experienceLevel: row.experience_level,
      skills: typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills || [],
      education: row.education || '',
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private mapResume(row: any): ResumeAnalysis {
    return {
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      targetJobRole: row.target_job_role,
      targetJobDescription: row.target_job_description || '',
      matchScore: row.match_score,
      atsScore: row.ats_score,
      identifiedSkills: typeof row.identified_skills === 'string' ? JSON.parse(row.identified_skills) : row.identified_skills || [],
      missingSkills: typeof row.missing_skills === 'string' ? JSON.parse(row.missing_skills) : row.missing_skills || [],
      strengths: typeof row.strengths === 'string' ? JSON.parse(row.strengths) : row.strengths || [],
      weaknesses: typeof row.weaknesses === 'string' ? JSON.parse(row.weaknesses) : row.weaknesses || [],
      suggestedImprovements: typeof row.suggested_improvements === 'string' ? JSON.parse(row.suggested_improvements) : row.suggested_improvements || [],
      keywordRecommendations: typeof row.keyword_recommendations === 'string' ? JSON.parse(row.keyword_recommendations) : row.keyword_recommendations || [],
      summary: row.summary || '',
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private mapJob(row: any): JobApplication {
    return {
      id: row.id,
      userId: row.user_id,
      company: row.company,
      role: row.role,
      postingUrl: row.posting_url || '',
      location: row.location,
      status: row.status,
      applicationDate: row.application_date instanceof Date ? row.application_date.toISOString().split('T')[0] : String(row.application_date),
      salary: row.salary || '',
      notes: row.notes || '',
      followUpDate: row.follow_up_date ? (row.follow_up_date instanceof Date ? row.follow_up_date.toISOString().split('T')[0] : String(row.follow_up_date)) : '',
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private mapInterview(row: any): InterviewSession {
    return {
      id: row.id,
      userId: row.user_id,
      targetRole: row.target_role,
      experienceLevel: row.experience_level,
      category: row.category,
      difficulty: row.difficulty,
      questionsCount: row.questions_count,
      status: row.status,
      questions: typeof row.questions === 'string' ? JSON.parse(row.questions) : row.questions || [],
      overallScore: row.overall_score !== null ? row.overall_score : undefined,
      overallSummary: row.overall_summary || undefined,
      createdAt: new Date(row.created_at).toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    };
  }

  private mapDsaProblem(row: any): DsaProblem {
    return {
      id: row.id,
      title: row.title,
      category: row.category,
      difficulty: row.difficulty,
      leetcodeNumber: row.leetcode_number ? Number(row.leetcode_number) : undefined,
      practiceUrl: row.practice_url,
      pattern: row.pattern,
    };
  }

  private mapDsaProgress(row: any): UserDsaProgress {
    return {
      id: row.id,
      userId: row.user_id,
      problemId: row.problem_id,
      status: row.status,
      notes: row.notes || '',
      isBookmarked: Boolean(row.is_bookmarked),
      solvedAt: row.solved_at ? new Date(row.solved_at).toISOString() : undefined,
      lastRevisedAt: row.last_revised_at ? new Date(row.last_revised_at).toISOString() : undefined,
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private mapActivity(row: any): UserActivity {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      title: row.title,
      description: row.description,
      type: row.type,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || undefined,
      timestamp: new Date(row.timestamp).toISOString(),
    };
  }
}
