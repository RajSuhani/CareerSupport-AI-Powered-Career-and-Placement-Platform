import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from './auth.ts';

/**
 * Standard 429 JSON response payload.
 */
function createRateLimitResponse(message: string, retryAfterSeconds?: number) {
  return {
    error: message,
    statusCode: 429,
    retryAfterSeconds: retryAfterSeconds || 60,
  };
}

/**
 * Safely extracts client IP address.
 * In a reverse-proxy environment (like Cloud Run or standard ingress),
 * Express 'req.ip' is used when 'app.set("trust proxy", 1)' is configured.
 * We do NOT trust arbitrary custom client headers directly to prevent spoofing.
 */
export function getSafeClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown-client';
}

/**
 * Rate Limiter for Authentication Endpoints:
 * - Login & Registration: 10 attempts per 15 minutes per IP.
 * - Prevents brute force credential stuffing and mass account creation.
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 attempts per window
  standardHeaders: true, // draft-6: `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req: Request) => getSafeClientIp(req),
  handler: (req: Request, res: Response) => {
    const retryAfter = Math.ceil(15 * 60);
    res.status(429).json(
      createRateLimitResponse(
        'Too many authentication attempts. Please wait 15 minutes before trying again.',
        retryAfter
      )
    );
  },
  skipSuccessfulRequests: false,
});

/**
 * Rate Limiter for Demo Login Endpoint:
 * - Demo login: 20 attempts per 15 minutes per IP.
 * - Allows convenient evaluator testing while preventing spamming.
 */
export const demoAuthRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => getSafeClientIp(req),
  handler: (req: Request, res: Response) => {
    res.status(429).json(
      createRateLimitResponse('Too many demo login requests. Please wait a moment before trying again.', 60)
    );
  },
});

/**
 * Rate Limiter for Resume Analysis:
 * - PDF parsing + Gemini 3.5 Pro deep audit is computationally and financially expensive.
 * - 10 analyses per hour per user (or IP if unauthenticated).
 */
export const resumeAnalysisRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // 10 analyses per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user ? `user:${authReq.user.id}` : `ip:${getSafeClientIp(req)}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json(
      createRateLimitResponse(
        'Resume analysis rate limit exceeded. You can analyze up to 10 resumes per hour. Please wait before submitting another resume.',
        3600
      )
    );
  },
});

/**
 * Rate Limiter for AI Mock Interview Generation:
 * - Calling Gemini to generate custom interview questions with rubric.
 * - 15 interview sessions started per hour per user.
 */
export const interviewStartRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 15, // 15 interview session starts per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user ? `user:${authReq.user.id}` : `ip:${getSafeClientIp(req)}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json(
      createRateLimitResponse(
        'Interview generation rate limit reached. You can generate up to 15 new interview sessions per hour.',
        3600
      )
    );
  },
});

/**
 * Rate Limiter for Interview Answer Evaluation:
 * - Evaluating candidates' text/voice answers with score breakdown and STAR feedback.
 * - 30 answer evaluations per 15 minutes per user.
 */
export const interviewEvaluationRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // 30 evaluations per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user ? `user:${authReq.user.id}` : `ip:${getSafeClientIp(req)}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json(
      createRateLimitResponse(
        'Answer evaluation rate limit reached. Please wait a few minutes before submitting your next answer.',
        900
      )
    );
  },
});

/**
 * Rate Limiter for Market Intelligence Grounded Research & AI Chat:
 * - Google Search grounding + multi-turn chat.
 * - 25 queries per 15 minutes per user.
 */
export const marketResearchRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 25, // 25 queries per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user ? `user:${authReq.user.id}` : `ip:${getSafeClientIp(req)}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json(
      createRateLimitResponse(
        'Market research rate limit reached. You can execute up to 25 queries per 15 minutes. Please wait before querying again.',
        900
      )
    );
  },
});

/**
 * Rate Limiter for Audio Transcription (gemini-3.5-transcribe):
 * - 20 audio transcriptions per 15 minutes per user.
 */
export const transcriptionRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 transcriptions per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthenticatedRequest;
    return authReq.user ? `user:${authReq.user.id}` : `ip:${getSafeClientIp(req)}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json(
      createRateLimitResponse(
        'Audio transcription rate limit reached. Please wait before submitting more audio.',
        900
      )
    );
  },
});
