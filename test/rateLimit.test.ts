import { describe, it, expect } from 'vitest';
import express from 'express';
import rateLimit from 'express-rate-limit';

describe('Rate Limiter Behavior & HTTP 429 Responses', () => {
  it('triggers HTTP 429 after exceeding configured request threshold', async () => {
    const app = express();

    // Create a strict test limiter of 3 requests per window
    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 3,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req, res) => {
        res.status(429).json({
          error: 'Too many requests. Please wait before retrying.',
          statusCode: 429,
          retryAfterSeconds: 60,
        });
      },
    });

    app.post('/api/auth/login-test', testLimiter, (_req, res) => {
      res.json({ success: true, message: 'Login successful' });
    });

    // Helper to simulate request via express dispatch
    const simulateRequest = (): Promise<{ status: number; body: any; headers: any }> => {
      return new Promise((resolve) => {
        const req: any = {
          method: 'POST',
          url: '/api/auth/login-test',
          headers: {},
          ip: '192.168.1.100',
          socket: { remoteAddress: '192.168.1.100' },
        };
        const headersOut: Record<string, any> = {};
        let responseStatus = 200;
        let responseBody: any = null;

        const res: any = {
          setHeader: (k: string, v: any) => {
            headersOut[k.toLowerCase()] = v;
            return res;
          },
          getHeader: (k: string) => headersOut[k.toLowerCase()],
          status: (code: number) => {
            responseStatus = code;
            return res;
          },
          json: (data: any) => {
            responseBody = data;
            resolve({ status: responseStatus, body: responseBody, headers: headersOut });
            return res;
          },
          send: (data: any) => {
            responseBody = data;
            resolve({ status: responseStatus, body: responseBody, headers: headersOut });
            return res;
          },
        };

        app(req, res);
      });
    };

    // Request 1: Below limit
    const res1 = await simulateRequest();
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // Request 2: Below limit
    const res2 = await simulateRequest();
    expect(res2.status).toBe(200);

    // Request 3: At limit
    const res3 = await simulateRequest();
    expect(res3.status).toBe(200);

    // Request 4: Exceeds limit -> 429
    const res4 = await simulateRequest();
    expect(res4.status).toBe(429);
    expect(res4.body.error).toContain('Too many requests');
    expect(res4.body.statusCode).toBe(429);
  });

  it('allows requests to stay functional below limit threshold for separate endpoints', async () => {
    const app = express();

    const aiLimiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 5,
      handler: (_req, res) => {
        res.status(429).json({ error: 'AI limit reached' });
      },
    });

    app.post('/api/ai/research-test', aiLimiter, (_req, res) => {
      res.json({ result: 'Simulated AI response' });
    });

    const simulateAiReq = (): Promise<{ status: number; body: any }> => {
      return new Promise((resolve) => {
        const req: any = {
          method: 'POST',
          url: '/api/ai/research-test',
          headers: {},
          ip: '10.0.0.5',
          socket: { remoteAddress: '10.0.0.5' },
        };
        let code = 200;
        const res: any = {
          setHeader: () => res,
          getHeader: () => undefined,
          status: (c: number) => {
            code = c;
            return res;
          },
          json: (b: any) => {
            resolve({ status: code, body: b });
            return res;
          },
        };
        app(req, res);
      });
    };

    // Make 2 calls (both well below limit of 5)
    const call1 = await simulateAiReq();
    expect(call1.status).toBe(200);
    expect(call1.body.result).toBe('Simulated AI response');

    const call2 = await simulateAiReq();
    expect(call2.status).toBe(200);
    expect(call2.body.result).toBe('Simulated AI response');
  });
});
