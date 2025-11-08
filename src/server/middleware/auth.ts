/**
 * JWT auth middleware
 * - expects Authorization: Bearer <token>
 * - sets req.user on success
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  try {
    const decoded = jwt.verify(token, jwtSecret);
    (req as any).user = decoded;
    next();
  } catch (err) {
    // JWT expired/invalid - no renewal attempt, client must re-auth
    res.status(401).json({ error: 'Invalid token' });
  }
};

