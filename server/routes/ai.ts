import { Router, type Response } from 'express';
import { z } from 'zod';
import { authMiddleware, type AuthenticatedRequest } from '../middleware/auth.ts';
import { marketResearchRateLimiter, transcriptionRateLimiter } from '../middleware/rateLimiter.ts';
import { transcribeAudio, searchGroundedMarketResearch, chatWithGemini } from '../services/ai.ts';

const router = Router();

const transcribeSchema = z.object({
  audioData: z.string().min(1, 'Audio data in base64 format is required'),
  mimeType: z.string().default('audio/webm'),
});

const marketResearchSchema = z.object({
  query: z.string().min(2, 'Query must be at least 2 characters'),
  role: z.string().optional(),
});

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      text: z.string().min(1),
    })
  ).min(1, 'At least one message is required'),
});

// POST /api/ai/transcribe - Audio transcription with gemini-3.5-transcribe
router.post('/transcribe', authMiddleware, transcriptionRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = transcribeSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { audioData, mimeType } = parseResult.data;
    const cleanBase64 = audioData.includes('base64,') ? audioData.split('base64,')[1] : audioData;

    const transcription = await transcribeAudio(cleanBase64, mimeType);
    res.json({ transcription });
  } catch (err: any) {
    console.error('Transcription route error:', err);
    res.status(500).json({ error: err.message || 'Failed to transcribe audio' });
  }
});

// POST /api/ai/market-research - Google Search Grounding with gemini-3.5-flash
router.post('/market-research', authMiddleware, marketResearchRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = marketResearchSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { query, role } = parseResult.data;
    const targetRole = role || req.user?.targetRole || 'Software Engineer';

    const result = await searchGroundedMarketResearch(query, targetRole);
    res.json(result);
  } catch (err: any) {
    console.error('Market research route error:', err);
    res.status(500).json({ error: err.message || 'Failed to execute search-grounded research' });
  }
});

// POST /api/ai/chat - Multi-turn conversation with gemini-3.5-flash
router.post('/chat', authMiddleware, marketResearchRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = chatSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.issues[0].message });
      return;
    }

    const { messages } = parseResult.data;
    const targetRole = req.user?.targetRole || 'Software Engineer';

    const reply = await chatWithGemini(messages, targetRole);
    res.json({ reply });
  } catch (err: any) {
    console.error('Chatbot route error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate chat response' });
  }
});

export default router;
