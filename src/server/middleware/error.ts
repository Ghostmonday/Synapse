/**
 * Error handler middleware
 */

import { Request, Response, NextFunction } from 'express';
import { telemetryHook } from '../../telemetry/index.js';
import { logError } from '../../shared/logger.js';

export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  telemetryHook(`error_${err.name}`); // Silent fail: if telemetry fails, error still logged
  logError('Request error', err);
  res.status(500).json({ error: 'Internal server error', message: err.message }); // Error branch: exposes error.message to client (security risk)
};

