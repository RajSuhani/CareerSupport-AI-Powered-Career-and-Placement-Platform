import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { JsonDatabaseAdapter } from '../server/db/jsonAdapter.ts';
import type { User, JobApplication, ResumeAnalysis, InterviewSession } from '../server/db/types.ts';

const TEST_DB_PATH = path.resolve(process.cwd(), 'data/test_database_sandbox.json');

describe('Database Storage & User Data Isolation', () => {
  let testDb: JsonDatabaseAdapter;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    testDb = new JsonDatabaseAdapter(TEST_DB_PATH);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('User Account Operations', () => {
    it('creates and finds users by ID and email', async () => {
      const user: User = {
        id: 'usr-test-1',
        name: 'Jordan Lee',
        email: 'jordan@college.edu',
        passwordHash: '$2b$10$hashed_test_password',
        targetRole: 'Backend Engineer',
        experienceLevel: 'Entry-Level',
        skills: ['Node.js', 'PostgreSQL', 'Docker'],
        education: 'B.S. in Computer Science',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const created = await testDb.createUser(user);
      expect(created.id).toBe('usr-test-1');

      const byId = await testDb.findUserById('usr-test-1');
      expect(byId).toBeDefined();
      expect(byId?.name).toBe('Jordan Lee');

      const byEmail = await testDb.findUserByEmail('JORDAN@college.edu');
      expect(byEmail).toBeDefined();
      expect(byEmail?.id).toBe('usr-test-1');
    });

    it('updates user profile fields correctly', async () => {
      const user: User = {
        id: 'usr-test-2',
        name: 'Alex Rivera',
        email: 'alex@college.edu',
        passwordHash: '$2b$10$hashed_test_password',
        targetRole: 'Frontend Engineer',
        experienceLevel: 'Entry-Level',
        skills: ['React'],
        education: 'B.S. CS',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await testDb.createUser(user);

      const updated = await testDb.updateUser('usr-test-2', {
        targetRole: 'Full-Stack Engineer',
        skills: ['React', 'TypeScript', 'Node.js'],
      });

      expect(updated).toBeDefined();
      expect(updated?.targetRole).toBe('Full-Stack Engineer');
      expect(updated?.skills).toEqual(['React', 'TypeScript', 'Node.js']);
    });
  });

  describe('Strict Multi-Tenant User Data Isolation', () => {
    const userA: User = {
      id: 'usr-alice',
      name: 'Alice',
      email: 'alice@uni.edu',
      passwordHash: 'hashA',
      targetRole: 'Software Engineer',
      experienceLevel: 'Entry-Level',
      skills: ['TypeScript'],
      education: 'B.S. CS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const userB: User = {
      id: 'usr-bob',
      name: 'Bob',
      email: 'bob@uni.edu',
      passwordHash: 'hashB',
      targetRole: 'Data Engineer',
      experienceLevel: 'Entry-Level',
      skills: ['Python'],
      education: 'B.S. CS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    beforeEach(async () => {
      await testDb.createUser(userA);
      await testDb.createUser(userB);
    });

    it('isolates job applications between users', async () => {
      const jobA: JobApplication = {
        id: 'job-alice-1',
        userId: userA.id,
        company: 'Stripe',
        role: 'Software Engineer',
        location: 'Remote',
        status: 'Interview',
        applicationDate: '2026-10-10',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const jobB: JobApplication = {
        id: 'job-bob-1',
        userId: userB.id,
        company: 'Google',
        role: 'Data Engineer',
        location: 'Mountain View, CA',
        status: 'Applied',
        applicationDate: '2026-10-11',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await testDb.createJob(jobA);
      await testDb.createJob(jobB);

      // User A can only see User A's jobs
      const aliceJobs = await testDb.getJobsByUser(userA.id);
      expect(aliceJobs).toHaveLength(1);
      expect(aliceJobs[0].id).toBe('job-alice-1');
      expect(aliceJobs[0].company).toBe('Stripe');

      // User B can only see User B's jobs
      const bobJobs = await testDb.getJobsByUser(userB.id);
      expect(bobJobs).toHaveLength(1);
      expect(bobJobs[0].id).toBe('job-bob-1');
      expect(bobJobs[0].company).toBe('Google');

      // User A cannot read or delete User B's job
      const unauthorizedAccess = await testDb.findJobById(jobB.id, userA.id);
      expect(unauthorizedAccess).toBeUndefined();

      const deleteAttempt = await testDb.deleteJob(jobB.id, userA.id);
      expect(deleteAttempt).toBe(false);

      // Verify Bob's job still exists intact
      const bobJobStillExists = await testDb.findJobById(jobB.id, userB.id);
      expect(bobJobStillExists).toBeDefined();
    });

    it('isolates resume analyses between users', async () => {
      const resumeA: ResumeAnalysis = {
        id: 'res-alice-1',
        userId: userA.id,
        fileName: 'Alice_Resume.pdf',
        targetJobRole: 'Software Engineer',
        targetJobDescription: 'TypeScript position',
        matchScore: 90,
        atsScore: 95,
        identifiedSkills: ['TypeScript'],
        missingSkills: [],
        strengths: ['Great experience'],
        weaknesses: [],
        suggestedImprovements: [],
        keywordRecommendations: [],
        summary: 'Excellent resume',
        createdAt: new Date().toISOString(),
      };

      await testDb.createResume(resumeA);

      const aliceResumes = await testDb.getResumesByUser(userA.id);
      expect(aliceResumes).toHaveLength(1);

      const bobResumes = await testDb.getResumesByUser(userB.id);
      expect(bobResumes).toHaveLength(0);

      const bobLookup = await testDb.findResumeById(resumeA.id, userB.id);
      expect(bobLookup).toBeUndefined();
    });

    it('isolates mock interview sessions between users', async () => {
      const sessionA: InterviewSession = {
        id: 'int-alice-1',
        userId: userA.id,
        targetRole: 'Full Stack',
        experienceLevel: 'Entry-Level',
        category: 'Technical',
        difficulty: 'Medium',
        questionsCount: 3,
        status: 'in_progress',
        questions: [{ id: 'q1', question: 'Explain Event Loop', category: 'Technical' }],
        createdAt: new Date().toISOString(),
      };

      await testDb.createInterview(sessionA);

      const aliceInterviews = await testDb.getInterviewsByUser(userA.id);
      expect(aliceInterviews).toHaveLength(1);

      const bobInterviews = await testDb.getInterviewsByUser(userB.id);
      expect(bobInterviews).toHaveLength(0);
    });

    it('isolates DSA practice tracker progress between users', async () => {
      await testDb.upsertUserDsaProgress(userA.id, 'dsa-1', {
        status: 'Solved',
        notes: 'Alice hash map solution',
      });

      await testDb.upsertUserDsaProgress(userB.id, 'dsa-1', {
        status: 'In Progress',
        notes: 'Bob brute force solution',
      });

      const aliceProgress = await testDb.getUserDsaProgress(userA.id);
      expect(aliceProgress).toHaveLength(1);
      expect(aliceProgress[0].status).toBe('Solved');
      expect(aliceProgress[0].notes).toBe('Alice hash map solution');

      const bobProgress = await testDb.getUserDsaProgress(userB.id);
      expect(bobProgress).toHaveLength(1);
      expect(bobProgress[0].status).toBe('In Progress');
      expect(bobProgress[0].notes).toBe('Bob brute force solution');
    });
  });

  describe('Activity Logging & Diagnostics', () => {
    it('records and returns chronological activities for a user', async () => {
      await testDb.logActivity({
        userId: 'usr-1',
        action: 'application_created',
        title: 'Application Created',
        description: 'Applied to Datadog',
        type: 'job',
      });

      await testDb.logActivity({
        userId: 'usr-1',
        action: 'interview_completed',
        title: 'Interview Completed',
        description: 'Technical screen completed',
        type: 'interview',
      });

      const activities = await testDb.getActivitiesByUser('usr-1', 10);
      expect(activities).toHaveLength(2);
      expect(activities[0].title).toBe('Interview Completed');
    });

    it('reports healthy diagnostic status when storage is functioning', async () => {
      const health = await testDb.checkHealth();
      expect(health.status).toBe('healthy');
      expect(health.type).toBe('json');
    });
  });

  describe('Database Failure Safety', () => {
    it('throws errors on failed write instead of silently ignoring failures', async () => {
      // Mock an adapter pointing to an invalid read-only / forbidden path
      const brokenAdapter = new JsonDatabaseAdapter(TEST_DB_PATH);
      (brokenAdapter as any).filePath = '/non_existent_system_dir/cannot_write.json';

      await expect(
        brokenAdapter.createUser({
          id: 'fail-usr',
          name: 'Fail User',
          email: 'fail@test.com',
          passwordHash: 'hash',
          targetRole: 'SWE',
          experienceLevel: 'Entry-Level',
          skills: [],
          education: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      ).rejects.toThrow(/Failed to persist/);
    });
  });
});
