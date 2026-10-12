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

export interface MigrationReport {
  sourceFile: string;
  timestamp: string;
  success: boolean;
  dryRun: boolean;
  counts: {
    users: { read: number; inserted: number; skipped: number; invalid: number };
    resumes: { read: number; inserted: number; skipped: number; invalid: number };
    jobs: { read: number; inserted: number; skipped: number; invalid: number };
    interviews: { read: number; inserted: number; skipped: number; invalid: number };
    dsaProblems: { read: number; inserted: number; skipped: number; invalid: number };
    dsaProgress: { read: number; inserted: number; skipped: number; invalid: number };
    activities: { read: number; inserted: number; skipped: number; invalid: number };
  };
  errors: string[];
}

export interface MigrationOptions {
  sourceFilePath?: string;
  targetDb: IDatabase;
  dryRun?: boolean;
}

export class JsonToDatabaseMigrator {
  /**
   * Safely reads and migrates data from the JSON file to the target database.
   * NEVER deletes the source JSON file.
   */
  public static async runMigration(options: MigrationOptions): Promise<MigrationReport> {
    const sourceFilePath = options.sourceFilePath || path.resolve(process.cwd(), 'data/careersupport_db.json');
    const dryRun = Boolean(options.dryRun);
    const targetDb = options.targetDb;

    const report: MigrationReport = {
      sourceFile: sourceFilePath,
      timestamp: new Date().toISOString(),
      success: true,
      dryRun,
      counts: {
        users: { read: 0, inserted: 0, skipped: 0, invalid: 0 },
        resumes: { read: 0, inserted: 0, skipped: 0, invalid: 0 },
        jobs: { read: 0, inserted: 0, skipped: 0, invalid: 0 },
        interviews: { read: 0, inserted: 0, skipped: 0, invalid: 0 },
        dsaProblems: { read: 0, inserted: 0, skipped: 0, invalid: 0 },
        dsaProgress: { read: 0, inserted: 0, skipped: 0, invalid: 0 },
        activities: { read: 0, inserted: 0, skipped: 0, invalid: 0 },
      },
      errors: [],
    };

    if (!fs.existsSync(sourceFilePath)) {
      report.errors.push(`Source file does not exist: ${sourceFilePath}`);
      report.success = false;
      return report;
    }

    let rawData: DatabaseSchema;
    try {
      const fileContent = fs.readFileSync(sourceFilePath, 'utf-8');
      rawData = JSON.parse(fileContent);
    } catch (err: any) {
      report.errors.push(`Failed to parse source JSON file: ${err.message}`);
      report.success = false;
      return report;
    }

    // Ensure target DB is initialized
    try {
      await targetDb.init();
    } catch (err: any) {
      report.errors.push(`Target database initialization failed: ${err.message}`);
      report.success = false;
      return report;
    }

    // 1. Migrate DSA Problems
    const dsaProblems = rawData.dsaProblems || DEFAULT_DSA_PROBLEMS;
    report.counts.dsaProblems.read = dsaProblems.length;
    for (const prob of dsaProblems) {
      if (!prob.id || !prob.title || !prob.category || !prob.difficulty) {
        report.counts.dsaProblems.invalid++;
        continue;
      }
      report.counts.dsaProblems.inserted++;
    }

    // 2. Migrate Users
    const users = rawData.users || [];
    report.counts.users.read = users.length;
    const existingUsers = await targetDb.getUsers();
    const existingUserIds = new Set(existingUsers.map(u => u.id));
    const existingUserEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));

    for (const user of users) {
      if (!user.id || !user.email || !user.name || !user.passwordHash) {
        report.counts.users.invalid++;
        report.errors.push(`Skipped invalid user record: missing required fields (${JSON.stringify(user)})`);
        continue;
      }

      if (existingUserIds.has(user.id) || existingUserEmails.has(user.email.toLowerCase())) {
        report.counts.users.skipped++;
        continue;
      }

      if (!dryRun) {
        try {
          await targetDb.createUser(user);
          existingUserIds.add(user.id);
          existingUserEmails.add(user.email.toLowerCase());
          report.counts.users.inserted++;
        } catch (err: any) {
          report.errors.push(`Failed to insert user ${user.id} (${user.email}): ${err.message}`);
        }
      } else {
        report.counts.users.inserted++;
      }
    }

    // 3. Migrate Resumes
    const resumes = rawData.resumes || [];
    report.counts.resumes.read = resumes.length;
    for (const res of resumes) {
      if (!res.id || !res.userId || !res.fileName) {
        report.counts.resumes.invalid++;
        continue;
      }

      // Check if user exists to preserve foreign key integrity
      if (!existingUserIds.has(res.userId)) {
        report.counts.resumes.invalid++;
        report.errors.push(`Skipped orphan resume ${res.id}: user ${res.userId} not found`);
        continue;
      }

      const existingRes = await targetDb.findResumeById(res.id, res.userId);
      if (existingRes) {
        report.counts.resumes.skipped++;
        continue;
      }

      if (!dryRun) {
        try {
          await targetDb.createResume(res);
          report.counts.resumes.inserted++;
        } catch (err: any) {
          report.errors.push(`Failed to insert resume ${res.id}: ${err.message}`);
        }
      } else {
        report.counts.resumes.inserted++;
      }
    }

    // 4. Migrate Jobs
    const jobs = rawData.jobs || [];
    report.counts.jobs.read = jobs.length;
    for (const job of jobs) {
      if (!job.id || !job.userId || !job.company || !job.role) {
        report.counts.jobs.invalid++;
        continue;
      }

      if (!existingUserIds.has(job.userId)) {
        report.counts.jobs.invalid++;
        report.errors.push(`Skipped orphan job ${job.id}: user ${job.userId} not found`);
        continue;
      }

      const existingJob = await targetDb.findJobById(job.id, job.userId);
      if (existingJob) {
        report.counts.jobs.skipped++;
        continue;
      }

      if (!dryRun) {
        try {
          await targetDb.createJob(job);
          report.counts.jobs.inserted++;
        } catch (err: any) {
          report.errors.push(`Failed to insert job ${job.id}: ${err.message}`);
        }
      } else {
        report.counts.jobs.inserted++;
      }
    }

    // 5. Migrate Interviews
    const interviews = rawData.interviews || [];
    report.counts.interviews.read = interviews.length;
    for (const session of interviews) {
      if (!session.id || !session.userId || !session.targetRole || !session.category) {
        report.counts.interviews.invalid++;
        continue;
      }

      if (!existingUserIds.has(session.userId)) {
        report.counts.interviews.invalid++;
        report.errors.push(`Skipped orphan interview ${session.id}: user ${session.userId} not found`);
        continue;
      }

      const existingSession = await targetDb.findInterviewById(session.id, session.userId);
      if (existingSession) {
        report.counts.interviews.skipped++;
        continue;
      }

      if (!dryRun) {
        try {
          await targetDb.createInterview(session);
          report.counts.interviews.inserted++;
        } catch (err: any) {
          report.errors.push(`Failed to insert interview ${session.id}: ${err.message}`);
        }
      } else {
        report.counts.interviews.inserted++;
      }
    }

    // 6. Migrate DSA Progress
    const dsaProgress = rawData.dsaProgress || [];
    report.counts.dsaProgress.read = dsaProgress.length;
    for (const prog of dsaProgress) {
      if (!prog.userId || !prog.problemId) {
        report.counts.dsaProgress.invalid++;
        continue;
      }

      if (!existingUserIds.has(prog.userId)) {
        report.counts.dsaProgress.invalid++;
        continue;
      }

      if (!dryRun) {
        try {
          await targetDb.upsertUserDsaProgress(prog.userId, prog.problemId, {
            status: prog.status,
            notes: prog.notes,
            isBookmarked: prog.isBookmarked,
            lastRevisedAt: prog.lastRevisedAt,
          });
          report.counts.dsaProgress.inserted++;
        } catch (err: any) {
          report.errors.push(`Failed to upsert DSA progress ${prog.id}: ${err.message}`);
        }
      } else {
        report.counts.dsaProgress.inserted++;
      }
    }

    // 7. Migrate Activities
    const activities = rawData.activities || [];
    report.counts.activities.read = activities.length;
    for (const act of activities) {
      if (!act.id || !act.userId || !act.action || !act.title) {
        report.counts.activities.invalid++;
        continue;
      }

      if (!existingUserIds.has(act.userId)) {
        report.counts.activities.invalid++;
        continue;
      }

      if (!dryRun) {
        try {
          await targetDb.logActivity({
            userId: act.userId,
            action: act.action,
            title: act.title,
            description: act.description,
            type: act.type,
            metadata: act.metadata,
            timestamp: act.timestamp,
          });
          report.counts.activities.inserted++;
        } catch (err: any) {
          report.errors.push(`Failed to insert activity ${act.id}: ${err.message}`);
        }
      } else {
        report.counts.activities.inserted++;
      }
    }

    report.success = report.errors.length === 0;
    return report;
  }
}
