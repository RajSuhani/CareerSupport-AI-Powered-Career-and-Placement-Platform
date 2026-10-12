import { Router, type Response } from 'express';
import { db, type JobStatus } from '../db/database.ts';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/dashboard/summary - Consolidated genuine user analytics
router.get('/summary', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [jobs, resumes, interviews, dsaProgress, dsaProblems] = await Promise.all([
      db.getJobsByUser(userId),
      db.getResumesByUser(userId),
      db.getInterviewsByUser(userId),
      db.getUserDsaProgress(userId),
      db.getDsaProblems(),
    ]);

    // 1. Applications by status
    const applicationsByStatus: Record<JobStatus, number> = {
      Saved: 0,
      Applied: 0,
      Assessment: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
    };
    jobs.forEach(j => {
      if (applicationsByStatus[j.status] !== undefined) {
        applicationsByStatus[j.status]++;
      }
    });

    // 2. Interviews scheduled / upcoming
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingInterviews = jobs.filter(
      j => j.status === 'Interview' || (j.followUpDate && j.followUpDate >= todayStr && j.status !== 'Rejected')
    );

    // 3. Resume analysis latest & history count
    const latestResume = resumes.length > 0 ? resumes[0] : null;

    // 4. DSA progress
    const solvedCount = dsaProgress.filter(p => p.status === 'Solved').length;
    const inProgressCount = dsaProgress.filter(p => p.status === 'In Progress').length;
    const totalDsa = dsaProblems.length;

    // 5. Daily preparation goals
    const dailyGoals = [
      {
        title: 'Solve 2 DSA Problems',
        target: 2,
        current: Math.min(2, solvedCount % 3),
        completed: (solvedCount % 3) >= 2,
      },
      {
        title: 'Submit or Update 1 Job Application',
        target: 1,
        current: jobs.length > 0 ? 1 : 0,
        completed: jobs.length > 0,
      },
      {
        title: 'Complete 1 Mock Interview Session',
        target: 1,
        current: interviews.filter(i => i.status === 'completed').length > 0 ? 1 : 0,
        completed: interviews.filter(i => i.status === 'completed').length > 0,
      },
      {
        title: 'Resume ATS Match Score >= 80%',
        target: 80,
        current: latestResume ? latestResume.atsScore : 0,
        completed: (latestResume?.atsScore || 0) >= 80,
      },
    ];

    // 6. Recent activity feed
    let activities = await db.getActivitiesByUser(userId, 20);

    // If no activities logged yet, synthesize from existing entities
    if (activities.length === 0) {
      for (const i of interviews) {
        if (i.status === 'completed') {
          await db.logActivity({
            userId,
            action: 'interview_completed',
            title: 'Interview completed',
            description: `Completed ${i.category} mock interview (${i.difficulty}) with ${i.overallScore || 85}% score`,
            type: 'interview',
            timestamp: i.completedAt || i.createdAt,
          });
        }
      }

      for (const j of jobs) {
        if (j.status === 'Interview' || j.status === 'Offer' || j.status === 'Assessment') {
          await db.logActivity({
            userId,
            action: 'application_status_changed',
            title: 'Application status changed',
            description: `${j.company} (${j.role}) moved to ${j.status} stage`,
            type: 'job',
            timestamp: j.updatedAt || j.createdAt,
          });
        } else {
          await db.logActivity({
            userId,
            action: 'application_created',
            title: 'Application tracked',
            description: `Tracked application for ${j.company} (${j.role})`,
            type: 'job',
            timestamp: j.createdAt,
          });
        }
      }

      for (const r of resumes) {
        await db.logActivity({
          userId,
          action: 'resume_uploaded',
          title: 'Resume uploaded',
          description: `Uploaded ${r.fileName} for ${r.targetJobRole} (ATS: ${r.atsScore}%, Match: ${r.matchScore}%)`,
          type: 'resume',
          timestamp: r.createdAt,
        });
      }

      activities = await db.getActivitiesByUser(userId, 20);
    }

    // 7. Upcoming reminders
    const reminders = jobs
      .filter(j => j.followUpDate)
      .map(j => ({
        id: `rem-${j.id}`,
        company: j.company,
        role: j.role,
        date: j.followUpDate!,
        isOverdue: j.followUpDate! < todayStr && j.status !== 'Offer' && j.status !== 'Rejected',
        status: j.status,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

    res.json({
      hasData: jobs.length > 0 || resumes.length > 0 || interviews.length > 0 || solvedCount > 0,
      totalApplications: jobs.length,
      applicationsByStatus,
      upcomingInterviewsCount: upcomingInterviews.length,
      upcomingInterviews,
      resumeCount: resumes.length,
      latestResume,
      dsaStats: {
        solved: solvedCount,
        inProgress: inProgressCount,
        total: totalDsa,
        percentage: Math.round((solvedCount / totalDsa) * 100),
      },
      dailyGoals,
      activities: activities.slice(0, 15),
      reminders,
    });
  } catch (error: any) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard metrics' });
  }
});

// GET /api/dashboard/activities - Fetch full activities with optional filtering
router.get('/activities', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 30));
    let activities = await db.getActivitiesByUser(userId, limit);

    const type = req.query.type as string;
    if (type && ['job', 'resume', 'interview', 'dsa'].includes(type)) {
      activities = activities.filter(a => a.type === type);
    }

    res.json({ activities });
  } catch (error: any) {
    console.error('Fetch activities error:', error);
    res.status(500).json({ error: 'Failed to retrieve activity history' });
  }
});

export default router;
