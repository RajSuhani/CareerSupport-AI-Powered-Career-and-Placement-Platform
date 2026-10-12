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
  DatabaseSchema,
} from './types.ts';
import { DEFAULT_DSA_PROBLEMS } from './types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'careersupport_db.json');

export class JsonDatabaseAdapter implements IDatabase {
  private data: DatabaseSchema = {
    users: [],
    resumes: [],
    jobs: [],
    interviews: [],
    dsaProblems: [],
    dsaProgress: [],
    activities: [],
  };

  private filePath: string;
  private isInitialized = false;

  constructor(customFilePath?: string) {
    this.filePath = customFilePath || DB_FILE;
    this.initSync();
  }

  private initSync(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.activities) this.data.activities = [];
        if (!this.data.dsaProblems || this.data.dsaProblems.length === 0) {
          this.data.dsaProblems = [...DEFAULT_DSA_PROBLEMS];
          this.persistSync();
        }
      } catch (err) {
        console.error('[JsonDatabase] Failed to read db file, initializing fresh:', err);
        this.data.dsaProblems = [...DEFAULT_DSA_PROBLEMS];
        this.data.activities = [];
        this.persistSync();
      }
    } else {
      this.data.dsaProblems = [...DEFAULT_DSA_PROBLEMS];
      this.data.activities = [];
      this.persistSync();
    }
    this.isInitialized = true;
  }

  public async init(): Promise<void> {
    if (!this.isInitialized) {
      this.initSync();
    }
  }

  public async checkHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; type: 'json'; isReady?: boolean; error?: string }> {
    try {
      if (fs.existsSync(this.filePath)) {
        return { status: 'healthy', type: 'json', isReady: this.isInitialized };
      }
      return { status: 'degraded', type: 'json', isReady: false, error: 'File does not exist yet' };
    } catch (err: any) {
      return { status: 'unhealthy', type: 'json', isReady: false, error: err.message };
    }
  }

  private persistSync(): void {
    try {
      const tempFile = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, this.filePath);
    } catch (err: any) {
      console.error('[JsonDatabase] Error persisting database:', err);
      throw new Error(`Failed to persist to JSON storage: ${err.message}`);
    }
  }

  // --- Users ---
  public async getUsers(): Promise<User[]> {
    return [...this.data.users];
  }

  public async findUserById(id: string): Promise<User | undefined> {
    const u = this.data.users.find(user => user.id === id);
    return u ? { ...u } : undefined;
  }

  public async findUserByEmail(email: string): Promise<User | undefined> {
    const u = this.data.users.find(user => user.email.toLowerCase() === email.toLowerCase());
    return u ? { ...u } : undefined;
  }

  public async createUser(user: User): Promise<User> {
    this.data.users.push({ ...user });
    this.persistSync();
    return { ...user };
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persistSync();
    return { ...this.data.users[idx] };
  }

  // --- Resumes ---
  public async getResumesByUser(userId: string): Promise<ResumeAnalysis[]> {
    return this.data.resumes
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(r => ({ ...r }));
  }

  public async findResumeById(id: string, userId: string): Promise<ResumeAnalysis | undefined> {
    const r = this.data.resumes.find(res => res.id === id && res.userId === userId);
    return r ? { ...r } : undefined;
  }

  public async createResume(resume: ResumeAnalysis): Promise<ResumeAnalysis> {
    this.data.resumes.push({ ...resume });
    this.persistSync();
    return { ...resume };
  }

  public async deleteResume(id: string, userId: string): Promise<boolean> {
    const initialLen = this.data.resumes.length;
    this.data.resumes = this.data.resumes.filter(r => !(r.id === id && r.userId === userId));
    if (this.data.resumes.length !== initialLen) {
      this.persistSync();
      return true;
    }
    return false;
  }

  // --- Jobs ---
  public async getJobsByUser(userId: string): Promise<JobApplication[]> {
    return this.data.jobs
      .filter(j => j.userId === userId)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
      .map(j => ({ ...j }));
  }

  public async findJobById(id: string, userId: string): Promise<JobApplication | undefined> {
    const j = this.data.jobs.find(job => job.id === id && job.userId === userId);
    return j ? { ...j } : undefined;
  }

  public async createJob(job: JobApplication): Promise<JobApplication> {
    this.data.jobs.push({ ...job });
    this.persistSync();
    return { ...job };
  }

  public async updateJob(id: string, userId: string, updates: Partial<JobApplication>): Promise<JobApplication | null> {
    const idx = this.data.jobs.findIndex(j => j.id === id && j.userId === userId);
    if (idx === -1) return null;
    this.data.jobs[idx] = {
      ...this.data.jobs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persistSync();
    return { ...this.data.jobs[idx] };
  }

  public async deleteJob(id: string, userId: string): Promise<boolean> {
    const initialLen = this.data.jobs.length;
    this.data.jobs = this.data.jobs.filter(j => !(j.id === id && j.userId === userId));
    if (this.data.jobs.length !== initialLen) {
      this.persistSync();
      return true;
    }
    return false;
  }

  // --- Interviews ---
  public async getInterviewsByUser(userId: string): Promise<InterviewSession[]> {
    return this.data.interviews
      .filter(i => i.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(i => ({ ...i }));
  }

  public async findInterviewById(id: string, userId: string): Promise<InterviewSession | undefined> {
    const i = this.data.interviews.find(session => session.id === id && session.userId === userId);
    return i ? { ...i } : undefined;
  }

  public async createInterview(interview: InterviewSession): Promise<InterviewSession> {
    this.data.interviews.push({ ...interview });
    this.persistSync();
    return { ...interview };
  }

  public async updateInterview(
    id: string,
    userId: string,
    updates: Partial<InterviewSession>
  ): Promise<InterviewSession | null> {
    const idx = this.data.interviews.findIndex(i => i.id === id && i.userId === userId);
    if (idx === -1) return null;
    this.data.interviews[idx] = { ...this.data.interviews[idx], ...updates };
    this.persistSync();
    return { ...this.data.interviews[idx] };
  }

  // --- DSA ---
  public async getDsaProblems(): Promise<DsaProblem[]> {
    return [...this.data.dsaProblems];
  }

  public async getUserDsaProgress(userId: string): Promise<UserDsaProgress[]> {
    return this.data.dsaProgress.filter(p => p.userId === userId).map(p => ({ ...p }));
  }

  public async upsertUserDsaProgress(
    userId: string,
    problemId: string,
    updates: Partial<Omit<UserDsaProgress, 'id' | 'userId' | 'problemId'>>
  ): Promise<UserDsaProgress> {
    const idx = this.data.dsaProgress.findIndex(p => p.userId === userId && p.problemId === problemId);
    const now = new Date().toISOString();

    if (idx >= 0) {
      this.data.dsaProgress[idx] = {
        ...this.data.dsaProgress[idx],
        ...updates,
        updatedAt: now,
      };
      this.persistSync();
      return { ...this.data.dsaProgress[idx] };
    } else {
      const newProgress: UserDsaProgress = {
        id: `prog-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        problemId,
        status: updates.status || 'Not Started',
        notes: updates.notes || '',
        isBookmarked: updates.isBookmarked ?? false,
        solvedAt: updates.status === 'Solved' ? now : undefined,
        lastRevisedAt: updates.lastRevisedAt,
        updatedAt: now,
      };
      this.data.dsaProgress.push(newProgress);
      this.persistSync();
      return { ...newProgress };
    }
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
    if (!this.data.activities) {
      this.data.activities = [];
    }
    const newAct: UserActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: activity.userId,
      action: activity.action,
      title: activity.title,
      description: activity.description,
      type: activity.type,
      metadata: activity.metadata,
      timestamp: activity.timestamp || new Date().toISOString(),
    };
    this.data.activities.unshift(newAct);
    if (this.data.activities.length > 250) {
      this.data.activities = this.data.activities.slice(0, 250);
    }
    this.persistSync();
    return { ...newAct };
  }

  public async getActivitiesByUser(userId: string, limit: number = 30): Promise<UserActivity[]> {
    if (!this.data.activities) {
      this.data.activities = [];
    }
    return this.data.activities
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
      .map(a => ({ ...a }));
  }

  public getRawData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }
}
