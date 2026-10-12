import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, type User } from '../db/database.ts';
import { resolveJwtSecret } from '../config/secrets.ts';

// Dynamically resolve JWT_SECRET based on runtime environment
export const getJwtSecret = (): string => {
  const result = resolveJwtSecret(process.env.JWT_SECRET, process.env.NODE_ENV);
  return result.secret;
};

// Export JWT_SECRET getter for backward compatibility with existing imports
export const JWT_SECRET = getJwtSecret();

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Check Bearer Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // 2. Check HTTP-only cookie
      token = req.cookies.token;
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Authentication token is required' });
      return;
    }

    const secret = getJwtSecret();
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, secret) as { userId: string };
    } catch {
      res.status(401).json({ error: 'Unauthorized: Session expired or invalid token' });
      return;
    }

    if (!decoded || !decoded.userId) {
      res.status(401).json({ error: 'Unauthorized: Invalid token signature' });
      return;
    }

    let user: User | undefined;
    try {
      user = await db.findUserById(decoded.userId);
    } catch (dbErr: any) {
      console.error('[AuthMiddleware] Database lookup error:', dbErr.message);
      res.status(500).json({ error: 'Internal server error: Database operation failed' });
      return;
    }

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: User account not found or removed' });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ error: 'Unauthorized: Session expired or invalid token' });
  }
}
