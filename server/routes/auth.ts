import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db, type User } from '../db/database.ts';
import { authMiddleware, type AuthenticatedRequest, JWT_SECRET } from '../middleware/auth.ts';

const router = Router();

// Validation Schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  targetRole: z.string().default('Software Engineer'),
  experienceLevel: z.enum(['Entry-Level', 'Student / Intern', 'Mid-Level', 'Career Switcher']).default('Entry-Level'),
  skills: z.array(z.string()).default([]),
  education: z.string().default(''),
});

const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  targetRole: z.string().optional(),
  experienceLevel: z.enum(['Entry-Level', 'Student / Intern', 'Mid-Level', 'Career Switcher']).optional(),
  skills: z.array(z.string()).optional(),
  education: z.string().optional(),
});

function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...rest } = user;
  return rest;
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { name, email, password, targetRole, experienceLevel, skills, education } = parseResult.data;

    const existingUser = db.findUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      email,
      passwordHash,
      targetRole,
      experienceLevel,
      skills,
      education,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createUser(newUser);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      user: sanitizeUser(newUser),
      token,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { email, password } = parseResult.data;
    const user = db.findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: sanitizeUser(user),
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/auth/demo-login (Quick evaluator login)
router.post('/demo-login', async (_req: Request, res: Response) => {
  try {
    const demoEmail = 'alex.chen@university.edu';
    let demoUser = db.findUserByEmail(demoEmail);

    if (!demoUser) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('DemoUser2026!', salt);

      demoUser = {
        id: 'usr-demo-student',
        name: 'Alex Chen',
        email: demoEmail,
        passwordHash,
        targetRole: 'Full-Stack Software Engineer',
        experienceLevel: 'Entry-Level',
        skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python', 'Tailwind CSS', 'Docker', 'Git'],
        education: 'B.S. in Computer Science, Expected May 2026',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.createUser(demoUser);

      // Seed initial realistic job applications for demo account
      db.createJob({
        id: 'job-demo-1',
        userId: demoUser.id,
        company: 'Stripe',
        role: 'New Grad Software Engineer',
        location: 'San Francisco, CA (Hybrid)',
        status: 'Interview',
        applicationDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        salary: '$145,000 - $160,000',
        postingUrl: 'https://stripe.com/jobs',
        notes: 'Technical screen passed with positive feedback on concurrency question. Final round scheduled for next Thursday.',
        followUpDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      db.createJob({
        id: 'job-demo-2',
        userId: demoUser.id,
        company: 'Figma',
        role: 'Associate Software Engineer',
        location: 'Remote',
        status: 'Assessment',
        applicationDate: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        salary: '$140,000',
        postingUrl: 'https://figma.com/careers',
        notes: 'Received HackerRank online assessment (75 mins). Need to review 2D canvas and tree traversal.',
        followUpDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      db.createJob({
        id: 'job-demo-3',
        userId: demoUser.id,
        company: 'Linear',
        role: 'Frontend Engineer - Entry Level',
        location: 'San Francisco, CA',
        status: 'Applied',
        applicationDate: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0],
        salary: '$135,000',
        notes: 'Tailored resume emphasizing web performance, keyboard shortcuts, and state management.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      db.createJob({
        id: 'job-demo-4',
        userId: demoUser.id,
        company: 'Datadog',
        role: 'Software Engineer - Infrastructure',
        location: 'New York, NY',
        status: 'Saved',
        applicationDate: new Date().toISOString().split('T')[0],
        salary: '$130,000',
        notes: 'Connecting with campus alum on LinkedIn before submitting.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Seed initial sample resume analysis
      db.createResume({
        id: 'res-demo-1',
        userId: demoUser.id,
        fileName: 'Alex_Chen_Software_Engineer_Resume.pdf',
        targetJobRole: 'Full-Stack Software Engineer',
        targetJobDescription: 'Seeking an entry-level engineer proficient in React, Node.js, RESTful APIs, and database modeling.',
        matchScore: 88,
        atsScore: 92,
        identifiedSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Git', 'REST APIs', 'Express', 'Tailwind CSS'],
        missingSkills: ['Redis caching', 'Kubernetes', 'CI/CD Pipelines (GitHub Actions)'],
        strengths: [
          'Excellent quantified metrics in project descriptions (e.g. reduced load times by 40%).',
          'Clean standard single-column ATS layout with clear section headers.',
          'Solid CS coursework and high GPA mentioned prominently.',
        ],
        weaknesses: [
          'Summary statement is slightly generic; recommend targeting specific backend architecture skills.',
          'Missing automated testing mentions (Jest, Vitest, Cypress).',
        ],
        suggestedImprovements: [
          'Add a specific testing framework to your skills list and mention test coverage percentage.',
          'Clarify the concurrency model used in the collaborative whiteboard project.',
          'Include links to live deployed demos alongside GitHub repositories.',
        ],
        keywordRecommendations: ['Unit Testing', 'Vitest', 'GitHub Actions', 'Microservices', 'Database Indexing'],
        summary: 'Alex presents a strong candidate profile with high ATS compliance and tangible technical contributions across full-stack web applications.',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      });

      // Seed sample DSA solved problems
      db.upsertUserDsaProgress(demoUser.id, 'dsa-1', { status: 'Solved', notes: 'Classic two pointer or hash map complement lookup. O(N) time and O(N) space.' });
      db.upsertUserDsaProgress(demoUser.id, 'dsa-2', { status: 'Solved', notes: 'Character frequency array of size 26 works in O(N).' });
      db.upsertUserDsaProgress(demoUser.id, 'dsa-5', { status: 'Solved', notes: 'Two pointers skipping non-alphanumeric chars.' });
      db.upsertUserDsaProgress(demoUser.id, 'dsa-10', { status: 'Solved', notes: 'Stack matching for brackets.' });
      db.upsertUserDsaProgress(demoUser.id, 'dsa-8', { status: 'Solved', notes: 'Keep minimum buy price seen so far.' });
      db.upsertUserDsaProgress(demoUser.id, 'dsa-3', { status: 'In Progress', notes: 'Sorting each string vs tuple count signature.' });

      // Seed chronological activities for demo user
      db.logActivity({
        userId: demoUser.id,
        action: 'interview_completed',
        title: 'Interview completed',
        description: 'Completed Technical interview round with 88% overall score',
        type: 'interview',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      });

      db.logActivity({
        userId: demoUser.id,
        action: 'application_status_changed',
        title: 'Application status changed',
        description: 'Stripe application moved from Assessment → Interview stage',
        type: 'job',
        timestamp: new Date(Date.now() - 14 * 3600000).toISOString(),
      });

      db.logActivity({
        userId: demoUser.id,
        action: 'application_status_changed',
        title: 'Application status changed',
        description: 'Figma application moved to Assessment stage (75 mins OA)',
        type: 'job',
        timestamp: new Date(Date.now() - 1.5 * 86400000).toISOString(),
      });

      db.logActivity({
        userId: demoUser.id,
        action: 'resume_uploaded',
        title: 'Resume uploaded',
        description: 'Uploaded Alex_Chen_Software_Engineer_Resume.pdf (ATS Score: 92%, Match: 88%)',
        type: 'resume',
        timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
      });

      db.logActivity({
        userId: demoUser.id,
        action: 'dsa_solved',
        title: 'DSA problem solved',
        description: 'Solved Two Sum (#1) using Hash Map complement approach in O(N)',
        type: 'dsa',
        timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
      });
    }

    // Ensure activities exist for demo user
    if (db.getActivitiesByUser(demoUser.id).length === 0) {
      db.logActivity({
        userId: demoUser.id,
        action: 'interview_completed',
        title: 'Interview completed',
        description: 'Completed Technical interview round with 88% overall score',
        type: 'interview',
        timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
      });

      db.logActivity({
        userId: demoUser.id,
        action: 'application_status_changed',
        title: 'Application status changed',
        description: 'Stripe application moved from Assessment → Interview stage',
        type: 'job',
        timestamp: new Date(Date.now() - 14 * 3600000).toISOString(),
      });

      db.logActivity({
        userId: demoUser.id,
        action: 'application_status_changed',
        title: 'Application status changed',
        description: 'Figma application moved to Assessment stage (75 mins OA)',
        type: 'job',
        timestamp: new Date(Date.now() - 1.5 * 86400000).toISOString(),
      });

      db.logActivity({
        userId: demoUser.id,
        action: 'resume_uploaded',
        title: 'Resume uploaded',
        description: 'Uploaded Alex_Chen_Software_Engineer_Resume.pdf (ATS Score: 92%, Match: 88%)',
        type: 'resume',
        timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
      });

      db.logActivity({
        userId: demoUser.id,
        action: 'dsa_solved',
        title: 'DSA problem solved',
        description: 'Solved Two Sum (#1) using Hash Map complement approach in O(N)',
        type: 'dsa',
        timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
      });
    }

    const token = jwt.sign({ userId: demoUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      user: sanitizeUser(demoUser),
      token,
      isDemo: true,
    });
  } catch (error: any) {
    console.error('Demo login error:', error);
    res.status(500).json({ error: 'Server error during demo login' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ user: sanitizeUser(req.user) });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const parseResult = profileUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.issues[0].message });
    return;
  }

  const updated = db.updateUser(req.user.id, parseResult.data);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user: sanitizeUser(updated) });
});

export default router;
