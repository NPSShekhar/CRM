import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`Error processing request ${req.method} ${req.url}: ${err.message}`, err);

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // Handle SyntaxError from malformed JSON body
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    sendError(res, 400, 'MALFORMED_JSON', 'Invalid JSON payload received');
    return;
  }

  // Fallback 500 error
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected internal error occurred'
      : err.message || 'Internal server error';

  sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
}
