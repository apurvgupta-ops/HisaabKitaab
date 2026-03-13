import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/node';
import { logger } from '../shared/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, string[]>;

  constructor(
    statusCode: number,
    message: string,
    code = 'INTERNAL_ERROR',
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: Record<string, string[]>) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(403, message, 'FORBIDDEN');
  }

  static notFound(resource = 'Resource') {
    return new AppError(404, `${resource} not found`, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new AppError(409, message, 'CONFLICT');
  }

  static tooManyRequests(message = 'Too many requests') {
    return new AppError(429, message, 'TOO_MANY_REQUESTS');
  }
}

const formatZodError = (error: ZodError): Record<string, string[]> => {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!details[path]) {
      details[path] = [];
    }
    details[path]!.push(issue.message);
  }
  return details;
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: formatZodError(err),
      },
    });
    return;
  }

  // Multer errors (file size, file count, file type)
  const multerErr = err as Error & { code?: string };
  if (multerErr.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 10MB limit' },
    });
    return;
  }
  if (multerErr.code === 'LIMIT_FILE_COUNT') {
    res.status(400).json({
      success: false,
      error: { code: 'TOO_MANY_FILES', message: 'Maximum 5 files allowed' },
    });
    return;
  }
  if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FIELD',
        message: 'Unexpected file field. Use "file" for single or "files" for multiple',
      },
    });
    return;
  }
  if (err.message === 'File type not allowed') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: 'Only images (jpeg, png, gif, webp) and PDFs are allowed',
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') ?? 'field';
        res.status(409).json({
          success: false,
          error: {
            code: 'CONFLICT',
            message: `A record with this ${target} already exists`,
          },
        });
        return;
      }
      case 'P2025':
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'The requested record was not found',
          },
        });
        return;
      case 'P2003':
        res.status(400).json({
          success: false,
          error: {
            code: 'FOREIGN_KEY_VIOLATION',
            message: 'Referenced record does not exist',
          },
        });
        return;
      default:
        logger.error({ err, prismaCode: err.code }, 'Unhandled Prisma error');
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided to database query',
      },
    });
    return;
  }

  logger.error({ err, requestId: (req as any).requestId }, 'Unhandled error');
  Sentry.captureException(err, {
    extra: { requestId: (req as any).requestId, url: req.originalUrl },
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
