import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, type User } from '../db/database.ts';

export const JWT_SECRET = process.env.JWT_SECRET || 'career_support_secure_development_jwt_secret_token_12345';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    if (!decoded || !decoded.userId) {
      res.status(401).json({ error: 'Unauthorized: Invalid token signature' });
      return;
    }

    const user = db.findUserById(decoded.userId);
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
