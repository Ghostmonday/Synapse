/**
 * JWT auth middleware
 * - expects Authorization: Bearer <token>
 * - sets req.user on success
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../services/api-keys-service.js';

// Cache JWT secret to avoid repeated DB calls
let cachedJwtSecret: string | null = null;
let secretCacheTime = 0;
const SECRET_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedJwtSecret(): Promise<string> {
  const now = Date.now();
  if (cachedJwtSecret && (now - secretCacheTime) < SECRET_CACHE_TTL) {
    return cachedJwtSecret;
  }
  
  cachedJwtSecret = await getJwtSecret();
  secretCacheTime = now;
  return cachedJwtSecret;
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const jwtSecret = await getCachedJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const decoded = jwt.verify(token, jwtSecret);
    (req as any).user = decoded;
    next();
  } catch (err) {
    // JWT expired/invalid - no renewal attempt, client must re-auth
    res.status(401).json({ error: 'Invalid token' });
  }
};

