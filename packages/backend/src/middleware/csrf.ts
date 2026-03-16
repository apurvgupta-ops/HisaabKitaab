import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { cacheSet, cacheGet, cacheDelete } from '../shared/cache/redis';
import { AppError } from './errorHandler';

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_COOKIE_NAME = '__csrf';
const CSRF_TTL = 60 * 60; // 1 hour
const CSRF_CACHE_PREFIX = 'csrf:';
const STATEFUL_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Skips CSRF for safe methods and for requests that don't use cookies (e.g. pure API with Bearer token).
 * Enable when using cookie-based sessions or when adding form submissions from cross-origin.
 */
export const csrfProtection = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!STATEFUL_METHODS.includes(req.method)) {
    return next();
  }

  const tokenFromHeader = req.headers[CSRF_TOKEN_HEADER] as string | undefined;
  const tokenFromCookie = req.cookies?.[CSRF_COOKIE_NAME];

  if (!tokenFromHeader || !tokenFromCookie) {
    return next(AppError.forbidden('CSRF token missing'));
  }

  if (tokenFromHeader !== tokenFromCookie) {
    return next(AppError.forbidden('CSRF token mismatch'));
  }

  const cached = await cacheGet<string>(`${CSRF_CACHE_PREFIX}${tokenFromHeader}`);
  if (!cached) {
    return next(AppError.forbidden('CSRF token expired or invalid'));
  }

  next();
};

/**
 * Generates a CSRF token, stores it in Redis, sets the cookie, and returns the token in the body.
 * Client must send the token in X-CSRF-Token header for state-changing requests.
 */
export const getCsrfToken = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const token = randomBytes(32).toString('hex');
  await cacheSet(`${CSRF_CACHE_PREFIX}${token}`, token, CSRF_TTL);

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api',
    maxAge: CSRF_TTL * 1000,
  });

  res.status(200).json({ token });
};

/**
 * Revokes a CSRF token (e.g. on logout).
 */
export const revokeCsrfToken = async (
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const token = req.cookies?.[CSRF_COOKIE_NAME];
  if (token) {
    await cacheDelete(`${CSRF_CACHE_PREFIX}${token}`);
  }
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/api' });
  res.status(204).send();
};
