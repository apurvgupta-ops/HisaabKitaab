import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../shared/logger';

const REQUEST_ID_HEADER = 'X-Request-Id';

/**
 * Assigns a unique request ID, logs request start/finish with timing,
 * and attaches the ID to the response headers for client-side correlation.
 */
export const requestTracer = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers[REQUEST_ID_HEADER.toLowerCase()] as string) || randomUUID();
  const startTime = Date.now();

  (req as any).requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  logger.info(
    {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    'Request started',
  );

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const logData = {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      userId: (req as any).user?.id,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'Request completed with server error');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Request completed with client error');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  next();
};
