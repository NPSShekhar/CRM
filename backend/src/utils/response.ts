import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, pagination?: {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(pagination && { pagination }),
  });
}

export function sendError(res: Response, statusCode: number, code: string, message: string, details?: unknown) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  });
}
