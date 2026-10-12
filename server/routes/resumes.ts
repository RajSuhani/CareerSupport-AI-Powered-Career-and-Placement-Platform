import { Router, type Response } from 'express';
import multer from 'multer';
import { createRequire } from 'module';
import { z } from 'zod';
import { db, type ResumeAnalysis } from '../db/database.ts';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.ts';
import { resumeAnalysisRateLimiter } from '../middleware/rateLimiter.ts';
import { analyzeResumeWithGemini } from '../services/ai.ts';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = Router();

// Multer memory storage configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF documents are supported.'));
    }
  },
});

// GET /api/resumes - Get analysis history for current user
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const history = await db.getResumesByUser(userId);
    res.json({ resumes: history });
  } catch (error: any) {
    console.error('Fetch resumes error:', error);
    res.status(500).json({ error: 'Failed to retrieve resume analyses' });
  }
});

// GET /api/resumes/:id - Get specific resume analysis
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const resume = await db.findResumeById(req.params.id, userId);
    if (!resume) {
      res.status(404).json({ error: 'Resume analysis not found or unauthorized' });
      return;
    }
    res.json({ resume });
  } catch (error: any) {
    console.error('Fetch resume by id error:', error);
    res.status(500).json({ error: 'Failed to retrieve resume analysis' });
  }
});

// DELETE /api/resumes/:id - Delete analysis
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const deleted = await db.deleteResume(req.params.id, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Resume record not found or unauthorized' });
      return;
    }
    res.json({ success: true, message: 'Resume analysis removed successfully' });
  } catch (error: any) {
    console.error('Delete resume error:', error);
    res.status(500).json({ error: 'Failed to delete resume analysis' });
  }
});

// POST /api/resumes/analyze - Analyze uploaded PDF or pasted text
router.post(
  '/analyze',
  authMiddleware,
  resumeAnalysisRateLimiter,
  upload.single('resumeFile'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      let resumeText = '';
      let fileName = 'Uploaded_Resume.pdf';

      // 1. Check if PDF file was uploaded
      if (req.file) {
        fileName = req.file.originalname;
        try {
          const parsed = await pdfParse(req.file.buffer);
          resumeText = (parsed.text || '').trim();
        } catch (pdfErr: any) {
          console.error('PDF parsing error:', pdfErr);
          res.status(400).json({
            error: 'Failed to extract text from PDF. The document may be corrupted, encrypted, or image-only scanned without OCR.',
          });
          return;
        }
      } else if (req.body.resumeText && typeof req.body.resumeText === 'string') {
        // Direct pasted text option
        resumeText = req.body.resumeText.trim();
        fileName = req.body.fileName || 'Pasted_Resume.txt';
      }

      if (!resumeText || resumeText.length < 50) {
        res.status(400).json({
          error: 'Resume text is too brief or empty. Please ensure the document contains at least 50 characters of readable text.',
        });
        return;
      }

      // Check max length
      if (resumeText.length > 25000) {
        resumeText = resumeText.slice(0, 25000);
      }

      const targetRole = (req.body.targetRole || 'Software Engineer').trim();
      const targetJobDescription = (req.body.targetJobDescription || '').trim();

      // Run AI Analysis via Gemini
      const aiResult = await analyzeResumeWithGemini(resumeText, targetRole, targetJobDescription);

      // Persist in DB
      const newAnalysis: ResumeAnalysis = {
        id: `res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId,
        fileName,
        targetJobRole: targetRole,
        targetJobDescription: targetJobDescription.slice(0, 5000),
        matchScore: Math.min(100, Math.max(0, aiResult.matchScore || 75)),
        atsScore: Math.min(100, Math.max(0, aiResult.atsScore || 80)),
        identifiedSkills: aiResult.identifiedSkills || [],
        missingSkills: aiResult.missingSkills || [],
        strengths: aiResult.strengths || [],
        weaknesses: aiResult.weaknesses || [],
        suggestedImprovements: aiResult.suggestedImprovements || [],
        keywordRecommendations: aiResult.keywordRecommendations || [],
        summary: aiResult.summary || 'Resume analysis completed successfully.',
        createdAt: new Date().toISOString(),
      };

      await db.createResume(newAnalysis);

      // Log user activity
      await db.logActivity({
        userId,
        action: 'resume_uploaded',
        title: 'Resume uploaded',
        description: `Uploaded ${fileName} for ${targetRole} (ATS: ${newAnalysis.atsScore}%, Match: ${newAnalysis.matchScore}%)`,
        type: 'resume',
        metadata: {
          resumeId: newAnalysis.id,
          fileName,
          atsScore: newAnalysis.atsScore,
          matchScore: newAnalysis.matchScore,
        },
      });

      res.status(201).json({
        success: true,
        resume: newAnalysis,
        disclaimer: 'Scores and insights are AI-generated estimations based on ATS heuristics and do not guarantee interview invites.',
      });
    } catch (error: any) {
      console.error('Resume analysis endpoint error:', error);
      res.status(500).json({
        error: error.message || 'Internal server error during resume analysis',
      });
    }
  }
);

export default router;
