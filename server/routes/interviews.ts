import { Router, type Response } from 'express';
import { z } from 'zod';
import { db, type InterviewSession, type InterviewCategory, type InterviewDifficulty } from '../db/database.ts';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.ts';
import { generateInterviewQuestions, evaluateInterviewAnswer } from '../services/ai.ts';

const router = Router();

const startInterviewSchema = z.object({
  targetRole: z.string().min(1, 'Target role is required'),
  experienceLevel: z.string().default('Entry-Level'),
  category: z.enum(['HR', 'Technical', 'SQL', 'Python', 'DSA Fundamentals', 'System Design']).default('Technical'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
  questionsCount: z.number().min(1).max(5).default(3),
});

const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: z.string().min(5, 'Answer must be at least 5 characters'),
  voiceRecorded: z.boolean().default(false),
});

// GET /api/interviews - List user's sessions
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const sessions = db.getInterviewsByUser(userId);
  res.json({ sessions });
});

// GET /api/interviews/:id - Session detail
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const session = db.findInterviewById(req.params.id, userId);
  if (!session) {
    res.status(404).json({ error: 'Interview session not found' });
    return;
  }
  res.json({ session });
});

// POST /api/interviews/start - Generate questions and create session
router.post('/start', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = startInterviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const userId = req.user!.id;
    const { targetRole, experienceLevel, category, difficulty, questionsCount } = parseResult.data;

    // Call Gemini to generate role-specific questions
    const generated = await generateInterviewQuestions(
      targetRole,
      experienceLevel,
      category,
      difficulty,
      questionsCount
    );

    const questionsList = generated.map((q, idx) => ({
      id: `q-${idx + 1}-${Date.now()}`,
      question: q.question,
      category: q.category || category,
      expectedKeyPoints: q.expectedKeyPoints || [],
    }));

    const session: InterviewSession = {
      id: `int-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId,
      targetRole,
      experienceLevel,
      category: category as InterviewCategory,
      difficulty: difficulty as InterviewDifficulty,
      questionsCount: questionsList.length,
      status: 'in_progress',
      questions: questionsList,
      createdAt: new Date().toISOString(),
    };

    db.createInterview(session);
    res.status(201).json({ session });
  } catch (error: any) {
    console.error('Start interview error:', error);
    res.status(500).json({ error: error.message || 'Failed to initialize mock interview' });
  }
});

// POST /api/interviews/:id/submit-answer - Grade single question answer
router.post('/:id/submit-answer', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = submitAnswerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const userId = req.user!.id;
    const session = db.findInterviewById(req.params.id, userId);
    if (!session) {
      res.status(404).json({ error: 'Interview session not found' });
      return;
    }

    const { questionId, answer, voiceRecorded } = parseResult.data;
    const qIndex = session.questions.findIndex(q => q.id === questionId);
    if (qIndex === -1) {
      res.status(404).json({ error: 'Question not found in this session' });
      return;
    }

    const questionItem = session.questions[qIndex];

    // Evaluate answer with Gemini
    const evaluation = await evaluateInterviewAnswer(
      session.targetRole,
      session.category,
      session.difficulty,
      questionItem.question,
      answer
    );

    questionItem.userAnswer = answer;
    questionItem.voiceRecorded = voiceRecorded;
    questionItem.score = evaluation.score;
    questionItem.feedback = evaluation;

    db.updateInterview(session.id, userId, { questions: session.questions });

    res.json({
      question: questionItem,
      evaluation,
    });
  } catch (error: any) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: error.message || 'Failed to evaluate answer' });
  }
});

// POST /api/interviews/:id/complete - Complete the session
router.post('/:id/complete', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const session = db.findInterviewById(req.params.id, userId);
    if (!session) {
      res.status(404).json({ error: 'Interview session not found' });
      return;
    }

    const answeredQuestions = session.questions.filter(q => q.score !== undefined);
    const avgScore =
      answeredQuestions.length > 0
        ? Math.round(answeredQuestions.reduce((acc, q) => acc + (q.score || 0), 0) / answeredQuestions.length)
        : 0;

    let overallSummary = 'Session completed.';
    if (avgScore >= 85) {
      overallSummary = 'Outstanding performance! You demonstrated clear technical communication, structured reasoning, and high domain relevance.';
    } else if (avgScore >= 70) {
      overallSummary = 'Solid performance! Your answers covered the main concepts well; focus on articulating trade-offs and quantitative examples to reach senior level.';
    } else {
      overallSummary = 'Good effort! Review the specific feedback points for each question to strengthen depth and structured problem-solving (e.g. STAR framework).';
    }

    const updated = db.updateInterview(session.id, userId, {
      status: 'completed',
      overallScore: avgScore,
      overallSummary,
      completedAt: new Date().toISOString(),
    });

    // Log user activity
    db.logActivity({
      userId,
      action: 'interview_completed',
      title: 'Interview completed',
      description: `Completed ${session.category} interview round (${session.difficulty}) with ${avgScore}% score`,
      type: 'interview',
      metadata: {
        interviewId: session.id,
        category: session.category,
        difficulty: session.difficulty,
        score: avgScore,
      },
    });

    res.json({ session: updated });
  } catch (error: any) {
    console.error('Complete interview error:', error);
    res.status(500).json({ error: 'Failed to complete interview session' });
  }
});

export default router;
