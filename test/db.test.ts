import { describe, it, expect, beforeEach } from 'vitest';
import { db, type JobApplication, type User } from '../server/db/database.ts';

describe('CareerSupport Database & Entity Operations', () => {
  const testUserId = `test-user-${Date.now()}`;

  beforeEach(() => {
    // Ensure test user exists
    if (!db.findUserById(testUserId)) {
      db.createUser({
        id: testUserId,
        name: 'Test Candidate',
        email: `candidate-${Date.now()}@test.edu`,
        passwordHash: 'dummy_hash',
        targetRole: 'Software Engineer',
        experienceLevel: 'Entry-Level',
        skills: ['TypeScript', 'React'],
        education: 'B.S. CS',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });

  it('creates and retrieves a job application for the authenticated user', () => {
    const newJob: JobApplication = {
      id: `job-test-${Date.now()}`,
      userId: testUserId,
      company: 'TestCorp Technologies',
      role: 'Junior Frontend Engineer',
      location: 'Remote',
      status: 'Applied',
      applicationDate: '2026-10-11',
      salary: '$120,000',
      notes: 'Applied via referral',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createJob(newJob);
    const found = db.findJobById(newJob.id, testUserId);
    expect(found).toBeDefined();
    expect(found?.company).toBe('TestCorp Technologies');
    expect(found?.status).toBe('Applied');
  });

  it('updates job application status correctly', () => {
    const job = db.getJobsByUser(testUserId)[0];
    expect(job).toBeDefined();

    const updated = db.updateJob(job.id, testUserId, { status: 'Interview', notes: 'Scheduled round 1' });
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('Interview');
    expect(updated?.notes).toBe('Scheduled round 1');
  });

  it('enforces user isolation: another user cannot access or delete records', () => {
    const job = db.getJobsByUser(testUserId)[0];
    const otherUserId = 'unauthorized-user-999';

    const notFound = db.findJobById(job.id, otherUserId);
    expect(notFound).toBeUndefined();

    const deleteAttempt = db.deleteJob(job.id, otherUserId);
    expect(deleteAttempt).toBe(false);
  });

  it('tracks and updates DSA problem progress', () => {
    const problemId = 'dsa-1'; // Two Sum
    const progress = db.upsertUserDsaProgress(testUserId, problemId, {
      status: 'Solved',
      notes: 'Solved using hash map in O(N) time and O(N) space.',
      isBookmarked: true,
    });

    expect(progress).toBeDefined();
    expect(progress.status).toBe('Solved');
    expect(progress.isBookmarked).toBe(true);

    const userProgress = db.getUserDsaProgress(testUserId);
    const found = userProgress.find(p => p.problemId === problemId);
    expect(found?.status).toBe('Solved');
  });

  it('logs and retrieves chronological user actions in descending order', () => {
    // 1. Resume uploaded
    db.logActivity({
      userId: testUserId,
      action: 'resume_uploaded',
      title: 'Resume uploaded',
      description: 'Uploaded Software_Engineer_Resume.pdf (ATS Score: 90%)',
      type: 'resume',
      timestamp: '2026-10-10T10:00:00.000Z',
    });

    // 2. Application status changed
    db.logActivity({
      userId: testUserId,
      action: 'application_status_changed',
      title: 'Application status changed',
      description: 'Google application advanced to Interview stage',
      type: 'job',
      timestamp: '2026-10-10T12:00:00.000Z',
    });

    // 3. Interview completed
    db.logActivity({
      userId: testUserId,
      action: 'interview_completed',
      title: 'Interview completed',
      description: 'Completed Technical mock interview with 92% score',
      type: 'interview',
      timestamp: '2026-10-10T14:00:00.000Z',
    });

    const activities = db.getActivitiesByUser(testUserId, 10);
    expect(activities.length).toBeGreaterThanOrEqual(3);

    // Verify chronological order: newest (14:00) first
    expect(activities[0].title).toBe('Interview completed');
    expect(activities[1].title).toBe('Application status changed');
    expect(activities[2].title).toBe('Resume uploaded');

    // Verify user isolation
    const otherUserActivities = db.getActivitiesByUser('other-user-999');
    expect(otherUserActivities.length).toBe(0);
  });
});
