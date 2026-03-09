import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config';
import { AppError } from './errorHandler';
import { prisma } from '../shared/database/prisma';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

/**
 * JWT authentication middleware. Extracts and verifies the Bearer token,
 * then attaches the user payload to req.user.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, env.jwt.secret) as { sub: string; email: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    (req as AuthenticatedRequest).user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      next(AppError.unauthorized('Invalid token'));
      return;
    }
    if (err instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized('Token expired'));
      return;
    }
    next(err);
  }
};
