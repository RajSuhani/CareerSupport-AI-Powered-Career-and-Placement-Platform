import { Router, type Response } from 'express';
import { z } from 'zod';
import { db, type JobApplication, type JobStatus } from '../db/database.ts';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

const jobSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  role: z.string().min(1, 'Role title is required'),
  postingUrl: z.string().url().or(z.literal('')).optional(),
  location: z.string().default('Remote / Hybrid'),
  status: z.enum(['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected']).default('Applied'),
  applicationDate: z.string().default(() => new Date().toISOString().split('T')[0]),
  salary: z.string().optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
});

const updateJobSchema = jobSchema.partial();

// GET /api/jobs - List with search, filtering, sorting, pagination
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let jobs = await db.getJobsByUser(userId);

    // Search filter
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    if (search) {
      jobs = jobs.filter(
        j =>
          j.company.toLowerCase().includes(search) ||
          j.role.toLowerCase().includes(search) ||
          (j.notes && j.notes.toLowerCase().includes(search)) ||
          j.location.toLowerCase().includes(search)
      );
    }

    // Status filter
    const status = req.query.status as JobStatus;
    if (status && ['Saved', 'Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'].includes(status)) {
      jobs = jobs.filter(j => j.status === status);
    }

    // Sorting
    const sort = req.query.sort as string;
    if (sort === 'date_asc') {
      jobs.sort((a, b) => new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime());
    } else if (sort === 'company_asc') {
      jobs.sort((a, b) => a.company.localeCompare(b.company));
    } else {
      // Default: date desc
      jobs.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
    }

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
    const total = jobs.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = jobs.slice((page - 1) * limit, page * limit);

    res.json({
      jobs: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('Fetch jobs error:', error);
    res.status(500).json({ error: 'Failed to retrieve job applications' });
  }
});

// GET /api/jobs/stats - Real metrics calculated from user's records
router.get('/stats', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const jobs = await db.getJobsByUser(userId);

    const statusCounts: Record<JobStatus, number> = {
      Saved: 0,
      Applied: 0,
      Assessment: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
    };

    const todayStr = new Date().toISOString().split('T')[0];
    let upcomingFollowUps = 0;
    let overdueFollowUps = 0;

    jobs.forEach(j => {
      if (statusCounts[j.status] !== undefined) {
        statusCounts[j.status]++;
      }
      if (j.followUpDate) {
        if (j.followUpDate >= todayStr) {
          upcomingFollowUps++;
        } else if (j.status !== 'Offer' && j.status !== 'Rejected') {
          overdueFollowUps++;
        }
      }
    });

    const total = jobs.length;
    const activeApplications = total - statusCounts.Rejected;
    const interviewRate = total > 0 ? Math.round(((statusCounts.Interview + statusCounts.Offer) / total) * 100) : 0;
    const offerRate = total > 0 ? Math.round((statusCounts.Offer / total) * 100) : 0;

    res.json({
      total,
      statusCounts,
      activeApplications,
      interviewRate,
      offerRate,
      upcomingFollowUps,
      overdueFollowUps,
    });
  } catch (error: any) {
    console.error('Job stats error:', error);
    res.status(500).json({ error: 'Failed to compute job statistics' });
  }
});

// GET /api/jobs/export/csv - CSV export with formula injection prevention
router.get('/export/csv', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const jobs = await db.getJobsByUser(userId);

    // Safe CSV cell escaping (prevent formula injection)
    const sanitizeCell = (val: string | undefined): string => {
      if (!val) return '""';
      let text = String(val).replace(/"/g, '""');
      if (/^[=+\-@]/.test(text)) {
        text = `'${text}`;
      }
      return `"${text}"`;
    };

    const headers = ['Company', 'Role', 'Status', 'Location', 'Application Date', 'Salary', 'Follow-up Date', 'Notes', 'URL'];
    const rows = jobs.map(j => [
      sanitizeCell(j.company),
      sanitizeCell(j.role),
      sanitizeCell(j.status),
      sanitizeCell(j.location),
      sanitizeCell(j.applicationDate),
      sanitizeCell(j.salary),
      sanitizeCell(j.followUpDate),
      sanitizeCell(j.notes),
      sanitizeCell(j.postingUrl),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="careersupport_jobs_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    console.error('Job CSV export error:', error);
    res.status(500).json({ error: 'Failed to export jobs to CSV' });
  }
});

// POST /api/jobs - Create job application
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = jobSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const userId = req.user!.id;
    const data = parseResult.data;

    const newJob: JobApplication = {
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      company: data.company.trim(),
      role: data.role.trim(),
      postingUrl: data.postingUrl?.trim() || '',
      location: data.location.trim(),
      status: data.status,
      applicationDate: data.applicationDate,
      salary: data.salary?.trim() || '',
      notes: data.notes?.trim() || '',
      followUpDate: data.followUpDate?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.createJob(newJob);

    // Log activity
    await db.logActivity({
      userId,
      action: 'application_created',
      title: 'Application tracked',
      description: `Added ${newJob.company} (${newJob.role}) - Stage: ${newJob.status}`,
      type: 'job',
      metadata: { jobId: newJob.id, company: newJob.company, status: newJob.status },
    });

    res.status(201).json({ job: newJob });
  } catch (error: any) {
    console.error('Create job error:', error);
    res.status(500).json({ error: 'Failed to create job application' });
  }
});

// PUT /api/jobs/:id - Update job
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = updateJobSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const userId = req.user!.id;
    const existingJob = await db.findJobById(req.params.id, userId);
    const updated = await db.updateJob(req.params.id, userId, parseResult.data);
    if (!updated) {
      res.status(404).json({ error: 'Job application not found or unauthorized' });
      return;
    }

    // Log status change if status changed
    if (parseResult.data.status && existingJob && existingJob.status !== parseResult.data.status) {
      await db.logActivity({
        userId,
        action: 'application_status_changed',
        title: 'Application status changed',
        description: `${updated.company} (${updated.role}) updated from ${existingJob.status} → ${updated.status}`,
        type: 'job',
        metadata: {
          jobId: updated.id,
          company: updated.company,
          previousStatus: existingJob.status,
          newStatus: updated.status,
        },
      });
    }

    res.json({ job: updated });
  } catch (error: any) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job application' });
  }
});

// DELETE /api/jobs/:id - Delete job
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const deleted = await db.deleteJob(req.params.id, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Job application not found or unauthorized' });
      return;
    }
    res.json({ success: true, message: 'Job application deleted successfully' });
  } catch (error: any) {
    console.error('Delete job error:', error);
    res.status(500).json({ error: 'Failed to delete job application' });
  }
});

export default router;
