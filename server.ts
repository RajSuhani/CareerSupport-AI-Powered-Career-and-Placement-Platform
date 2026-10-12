import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { Modality, type LiveServerMessage } from '@google/genai';
import { getAIClient } from './server/services/ai.ts';
import authRoutes from './server/routes/auth.ts';
import resumeRoutes from './server/routes/resumes.ts';
import jobRoutes from './server/routes/jobs.ts';
import interviewRoutes from './server/routes/interviews.ts';
import dsaRoutes from './server/routes/dsa.ts';
import dashboardRoutes from './server/routes/dashboard.ts';
import aiRoutes from './server/routes/ai.ts';
import { assertValidServerConfiguration } from './server/config/secrets.ts';
import { db, initDatabase, getDatabaseType, isPostgresConfigured } from './server/db/database.ts';

dotenv.config();

// Assert security configuration before starting services
assertValidServerConfiguration();

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Enable trust proxy for standard reverse proxies (Cloud Run, GCP load balancers, etc.)
// Express rate limiter and IP detection will correctly read X-Forwarded-For when 1 hop upstream
app.set('trust proxy', 1);

// Body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/practice/dsa', dsaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  try {
    const dbHealth = await db.checkHealth();
    const isHealthy = dbHealth.status === 'healthy';
    const httpStatus = dbHealth.status === 'unhealthy' ? 503 : 200;

    res.status(httpStatus).json({
      status: isHealthy ? 'ok' : dbHealth.status,
      timestamp: new Date().toISOString(),
      service: 'CareerSupport API',
      database: {
        ...dbHealth,
        ready: dbHealth.isReady ?? (dbHealth.status === 'healthy'),
      },
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'CareerSupport API',
      database: {
        status: 'unhealthy',
        ready: false,
        type: isPostgresConfigured() ? 'postgres' : 'json',
        error: err.message || 'Database health check failed',
      },
    });
  }
});

// WebSocket Server for Gemini 3.8 Live API Voice Conversations
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live Voice API');

  let session: any = null;

  try {
    const ai = getAIClient();
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
        systemInstruction:
          'You are CareerSupport AI Live Coach, a supportive, articulate, and technical placement mentor. You speak naturally and concisely in 1-3 sentences per turn so the student can respond easily. Ask technical or behavioral interview questions, evaluate answers warmly, and provide tips.',
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'audio', audio }));
          }
          if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }
        },
        onerror: (err: any) => {
          console.error('Gemini Live session error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'error', error: err?.message || 'Live session error' }));
          }
        },
        onclose: () => {
          console.log('Gemini Live session closed');
        },
      },
    });

    clientWs.on('message', (data: any) => {
      try {
        const payload = JSON.parse(data.toString());
        if (payload.audio && session) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch (err) {
        console.error('Error forwarding client audio to Gemini Live:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('Client disconnected from Live Voice API');
      if (session) {
        try {
          session.close();
        } catch (e) {
          // ignore
        }
      }
    });
  } catch (err: any) {
    console.error('Failed to initiate Gemini Live session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'error', error: err?.message || 'Failed to connect to Live API' }));
      clientWs.close();
    }
  }
});

async function startServer() {
  console.log('[Startup] Initializing persistent database storage...');
  try {
    await initDatabase();
    console.log(`[Startup] Database initialized and verified ready (${getDatabaseType()})`);
  } catch (err: any) {
    console.error(`[FATAL Startup Error] Database initialization failed: ${err.message}`);
    if (isPostgresConfigured()) {
      console.error(
        '[FATAL Startup Error] PostgreSQL is configured via DATABASE_URL/Cloud SQL, but connection or initialization failed.\n' +
        'Startup aborted to prevent silent fallback to ephemeral storage or data corruption.'
      );
    }
    throw err;
  }

  if (!isProduction) {
    // Development mode with Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);

    // Fallback for SPA routing in development
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    // Production static file serving
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));

    app.get('*', (req, res) => {
      if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return new Promise<void>((resolve, reject) => {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 CareerSupport Full-Stack Server running at http://localhost:${PORT}`);
      resolve();
    });
    server.on('error', (err) => {
      reject(err);
    });
  });
}

// In test runner environments, do not automatically start the HTTP server
if (process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app, server, startServer };
