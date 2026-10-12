import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JsonDatabaseAdapter } from '../server/db/jsonAdapter.ts';
import { JsonToDatabaseMigrator } from '../server/db/migrator.ts';

const FIXTURE_DIR = path.resolve(process.cwd(), 'data/test_fixtures');
const SOURCE_JSON_FILE = path.join(FIXTURE_DIR, 'source_test_db.json');
const TARGET_DB_FILE = path.join(FIXTURE_DIR, 'target_test_db.json');

describe('JSON to Database Safe Migration Engine', () => {
  beforeEach(() => {
    if (!fs.existsSync(FIXTURE_DIR)) {
      fs.mkdirSync(FIXTURE_DIR, { recursive: true });
    }

    // Prepare realistic source JSON data
    const fixtureData = {
      users: [
        {
          id: 'usr-mig-1',
          name: 'Samantha Ray',
          email: 'samantha@university.edu',
          passwordHash: '$2b$10$dummy_migrated_hash_1',
          targetRole: 'Software Engineer',
          experienceLevel: 'Entry-Level',
          skills: ['TypeScript', 'React'],
          education: 'B.S. CS 2026',
          createdAt: '2026-10-01T12:00:00.000Z',
          updatedAt: '2026-10-01T12:00:00.000Z',
        },
        {
          id: 'usr-mig-2',
          name: 'Marcus Vance',
          email: 'marcus@university.edu',
          passwordHash: '$2b$10$dummy_migrated_hash_2',
          targetRole: 'Backend Engineer',
          experienceLevel: 'Entry-Level',
          skills: ['Python', 'SQL'],
          education: 'B.S. CS 2025',
          createdAt: '2026-10-02T12:00:00.000Z',
          updatedAt: '2026-10-02T12:00:00.000Z',
        },
      ],
      jobs: [
        {
          id: 'job-mig-1',
          userId: 'usr-mig-1',
          company: 'Cloudflare',
          role: 'Systems Engineer',
          location: 'Austin, TX',
          status: 'Interview',
          applicationDate: '2026-10-05',
          createdAt: '2026-10-05T10:00:00.000Z',
          updatedAt: '2026-10-05T10:00:00.000Z',
        },
      ],
      resumes: [
        {
          id: 'res-mig-1',
          userId: 'usr-mig-1',
          fileName: 'Samantha_Resume.pdf',
          targetJobRole: 'Software Engineer',
          targetJobDescription: 'Systems engineering position',
          matchScore: 89,
          atsScore: 91,
          identifiedSkills: ['TypeScript', 'React'],
          missingSkills: ['Rust'],
          strengths: ['Strong systems knowledge'],
          weaknesses: [],
          suggestedImprovements: [],
          keywordRecommendations: [],
          summary: 'Great candidate',
          createdAt: '2026-10-03T10:00:00.000Z',
        },
      ],
      interviews: [
        {
          id: 'int-mig-1',
          userId: 'usr-mig-1',
          targetRole: 'Software Engineer',
          experienceLevel: 'Entry-Level',
          category: 'Technical',
          difficulty: 'Medium',
          questionsCount: 3,
          status: 'completed',
          questions: [],
          overallScore: 88,
          createdAt: '2026-10-06T10:00:00.000Z',
        },
      ],
      dsaProgress: [
        {
          id: 'prog-mig-1',
          userId: 'usr-mig-1',
          problemId: 'dsa-1',
          status: 'Solved',
          notes: 'Hash map approach',
          isBookmarked: true,
          updatedAt: '2026-10-07T10:00:00.000Z',
        },
      ],
      activities: [
        {
          id: 'act-mig-1',
          userId: 'usr-mig-1',
          action: 'application_created',
          title: 'Tracked Cloudflare',
          description: 'Added application',
          type: 'job',
          timestamp: '2026-10-05T10:00:00.000Z',
        },
      ],
    };

    fs.writeFileSync(SOURCE_JSON_FILE, JSON.stringify(fixtureData, null, 2), 'utf-8');

    if (fs.existsSync(TARGET_DB_FILE)) {
      fs.unlinkSync(TARGET_DB_FILE);
    }
  });

  afterEach(() => {
    if (fs.existsSync(SOURCE_JSON_FILE)) {
      fs.unlinkSync(SOURCE_JSON_FILE);
    }
    if (fs.existsSync(TARGET_DB_FILE)) {
      fs.unlinkSync(TARGET_DB_FILE);
    }
  });

  it('migrates all valid records into target database accurately', async () => {
    const targetDb = new JsonDatabaseAdapter(TARGET_DB_FILE);

    const report = await JsonToDatabaseMigrator.runMigration({
      sourceFilePath: SOURCE_JSON_FILE,
      targetDb,
      dryRun: false,
    });

    expect(report.success).toBe(true);
    expect(report.counts.users.inserted).toBe(2);
    expect(report.counts.jobs.inserted).toBe(1);
    expect(report.counts.resumes.inserted).toBe(1);
    expect(report.counts.interviews.inserted).toBe(1);
    expect(report.counts.dsaProgress.inserted).toBe(1);
    expect(report.counts.activities.inserted).toBe(1);

    // Verify records exist in target DB
    const users = await targetDb.getUsers();
    expect(users).toHaveLength(2);

    const jobs = await targetDb.getJobsByUser('usr-mig-1');
    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toBe('Cloudflare');
  });

  it('preserves the source JSON file without deleting or modifying it', async () => {
    const targetDb = new JsonDatabaseAdapter(TARGET_DB_FILE);
    const originalContent = fs.readFileSync(SOURCE_JSON_FILE, 'utf-8');

    await JsonToDatabaseMigrator.runMigration({
      sourceFilePath: SOURCE_JSON_FILE,
      targetDb,
      dryRun: false,
    });

    expect(fs.existsSync(SOURCE_JSON_FILE)).toBe(true);
    const contentAfter = fs.readFileSync(SOURCE_JSON_FILE, 'utf-8');
    expect(contentAfter).toBe(originalContent);
  });

  it('ensures idempotency and prevents duplicates on repeated migration runs', async () => {
    const targetDb = new JsonDatabaseAdapter(TARGET_DB_FILE);

    // Pass 1: Initial migration
    const report1 = await JsonToDatabaseMigrator.runMigration({
      sourceFilePath: SOURCE_JSON_FILE,
      targetDb,
      dryRun: false,
    });
    expect(report1.counts.users.inserted).toBe(2);

    // Pass 2: Re-running migration over already populated target DB
    const report2 = await JsonToDatabaseMigrator.runMigration({
      sourceFilePath: SOURCE_JSON_FILE,
      targetDb,
      dryRun: false,
    });

    // Zero duplicate users inserted; existing users skipped
    expect(report2.counts.users.inserted).toBe(0);
    expect(report2.counts.users.skipped).toBe(2);
    expect(report2.counts.jobs.inserted).toBe(0);
    expect(report2.counts.jobs.skipped).toBe(1);

    // Verify user count in target DB has not doubled
    const users = await targetDb.getUsers();
    expect(users).toHaveLength(2);
  });

  it('safely handles and skips invalid/corrupted records with informative warnings', async () => {
    const corruptedData = {
      users: [
        { id: 'good-usr', name: 'Valid User', email: 'valid@uni.edu', passwordHash: 'hash' },
        { id: '', name: 'Invalid User No Id', email: 'no_id@uni.edu', passwordHash: 'hash' }, // missing id
        { id: 'no-email-usr', name: 'No Email' }, // missing email and hash
      ],
    };
    fs.writeFileSync(SOURCE_JSON_FILE, JSON.stringify(corruptedData), 'utf-8');

    const targetDb = new JsonDatabaseAdapter(TARGET_DB_FILE);
    const report = await JsonToDatabaseMigrator.runMigration({
      sourceFilePath: SOURCE_JSON_FILE,
      targetDb,
      dryRun: false,
    });

    expect(report.counts.users.inserted).toBe(1);
    expect(report.counts.users.invalid).toBe(2);
    expect(report.errors.length).toBeGreaterThanOrEqual(2);

    const users = await targetDb.getUsers();
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe('good-usr');
  });

  it('supports dry-run mode without modifying the target database', async () => {
    const targetDb = new JsonDatabaseAdapter(TARGET_DB_FILE);

    const report = await JsonToDatabaseMigrator.runMigration({
      sourceFilePath: SOURCE_JSON_FILE,
      targetDb,
      dryRun: true,
    });

    expect(report.dryRun).toBe(true);
    expect(report.counts.users.inserted).toBe(2);

    // Target DB remains completely empty
    const users = await targetDb.getUsers();
    expect(users).toHaveLength(0);
  });
});
