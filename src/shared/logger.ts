/**
 * Shared logging utilities
 * Provides consistent logging across the application
 * Production-ready logger abstraction
 */

interface LogContext {
  error?: Error | unknown;
  [key: string]: unknown;
}

export function logInfo(message: string, ...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Sinapse INFO] ${message}`, ...args);
  }
}

export function logWarning(message: string, ...args: unknown[]): void {
  console.warn(`[Sinapse WARN] ${message}`, ...args);
}

export function logError(message: string, error?: Error | unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error || '');
  console.error(`[Sinapse ERROR] ${message}`, errorMessage);
  if (error instanceof Error && process.env.NODE_ENV !== 'production') {
    console.error('Stack trace:', error.stack);
  }
}

// Legacy alias for backward compatibility
export function log(...args: unknown[]): void {
  logInfo(String(args[0] || ''), ...args.slice(1));
}

