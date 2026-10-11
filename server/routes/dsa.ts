import { Router, type Response } from 'express';
import { z } from 'zod';
import { db, type DsaCategory, type DsaDifficulty, type DsaStatus } from '../db/database.ts';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

const updateProgressSchema = z.object({
  status: z.enum(['Not Started', 'In Progress', 'Solved']).optional(),
  notes: z.string().optional(),
  isBookmarked: z.boolean().optional(),
  lastRevisedAt: z.string().optional(),
});

// GET /api/practice/dsa - Get all questions merged with user progress
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const problems = db.getDsaProblems();
  const userProgressList = db.getUserDsaProgress(userId);

  const progressMap = new Map(userProgressList.map(p => [p.problemId, p]));

  let enriched = problems.map(prob => {
    const prog = progressMap.get(prob.id);
    return {
      ...prob,
      status: (prog?.status || 'Not Started') as DsaStatus,
      notes: prog?.notes || '',
      isBookmarked: prog?.isBookmarked || false,
      solvedAt: prog?.solvedAt,
      lastRevisedAt: prog?.lastRevisedAt,
    };
  });

  // Search filter
  const search = (req.query.search as string || '').toLowerCase().trim();
  if (search) {
    enriched = enriched.filter(
      p =>
        p.title.toLowerCase().includes(search) ||
        p.pattern.toLowerCase().includes(search) ||
        p.category.toLowerCase().includes(search)
    );
  }

  // Category filter
  const category = req.query.category as DsaCategory;
  if (category) {
    enriched = enriched.filter(p => p.category === category);
  }

  // Difficulty filter
  const difficulty = req.query.difficulty as DsaDifficulty;
  if (difficulty) {
    enriched = enriched.filter(p => p.difficulty === difficulty);
  }

  // Status filter
  const status = req.query.status as DsaStatus;
  if (status) {
    enriched = enriched.filter(p => p.status === status);
  }

  // Bookmarked only filter
  if (req.query.bookmarked === 'true') {
    enriched = enriched.filter(p => p.isBookmarked);
  }

  res.json({ problems: enriched });
});

// GET /api/practice/dsa/stats - Aggregated stats
router.get('/stats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const problems = db.getDsaProblems();
  const userProgressList = db.getUserDsaProgress(userId);

  const progressMap = new Map(userProgressList.map(p => [p.problemId, p]));

  let totalSolved = 0;
  let totalInProgress = 0;

  const difficultyStats: Record<DsaDifficulty, { solved: number; total: number }> = {
    Easy: { solved: 0, total: 0 },
    Medium: { solved: 0, total: 0 },
    Hard: { solved: 0, total: 0 },
  };

  const categoryStats: Record<string, { solved: number; total: number }> = {};

  problems.forEach(prob => {
    // Difficulty
    if (!difficultyStats[prob.difficulty]) {
      difficultyStats[prob.difficulty] = { solved: 0, total: 0 };
    }
    difficultyStats[prob.difficulty].total++;

    // Category
    if (!categoryStats[prob.category]) {
      categoryStats[prob.category] = { solved: 0, total: 0 };
    }
    categoryStats[prob.category].total++;

    const prog = progressMap.get(prob.id);
    if (prog?.status === 'Solved') {
      totalSolved++;
      difficultyStats[prob.difficulty].solved++;
      categoryStats[prob.category].solved++;
    } else if (prog?.status === 'In Progress') {
      totalInProgress++;
    }
  });

  const totalProblems = problems.length;
  const completionPercentage = totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0;

  // Calculate simulated streak from solved items
  const solvedWithDates = userProgressList.filter(p => p.status === 'Solved' && p.solvedAt);
  const streakDays = Math.min(7, Math.max(1, Math.ceil(solvedWithDates.length / 2)));

  res.json({
    totalProblems,
    totalSolved,
    totalInProgress,
    totalNotStarted: totalProblems - (totalSolved + totalInProgress),
    completionPercentage,
    streakDays,
    difficultyStats,
    categoryStats: Object.entries(categoryStats).map(([category, counts]) => ({
      category,
      solved: counts.solved,
      total: counts.total,
      percentage: Math.round((counts.solved / counts.total) * 100),
    })),
  });
});

// PUT /api/practice/dsa/:problemId - Update problem progress
router.put('/:problemId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = updateProgressSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const userId = req.user!.id;
    const { problemId } = req.params;

    const updated = db.upsertUserDsaProgress(userId, problemId, parseResult.data);

    if (parseResult.data.status === 'Solved') {
      const allProblems = db.getDsaProblems();
      const prob = allProblems.find(p => p.id === problemId);
      db.logActivity({
        userId,
        action: 'dsa_solved',
        title: 'DSA problem solved',
        description: `Solved ${prob ? prob.title : 'problem'} (${prob ? prob.category : 'DSA'})`,
        type: 'dsa',
        metadata: {
          problemId,
          title: prob?.title,
          difficulty: prob?.difficulty,
        },
      });
    }

    res.json({ progress: updated });
  } catch (error: any) {
    console.error('Update DSA progress error:', error);
    res.status(500).json({ error: 'Failed to update problem progress' });
  }
});

export default router;
