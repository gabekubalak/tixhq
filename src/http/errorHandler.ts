import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not found', code: 'not_found' });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }
  req.log?.error({ err }, 'unhandled error');
  res.status(500).json({ error: 'internal server error', code: 'internal_error' });
}
