/**
 * Error handler middleware
 */

import { Request, Response, NextFunction } from 'express';
import { telemetryHook } from '../../telemetry/index.js';
import { logError } from '../../shared/logger.js';

export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  telemetryHook(`error_${err.name}`);
  logError('Request error', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
};

