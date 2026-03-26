import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { authService } from './auth.service';

/**
 * POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, inviteToken } = req.body as {
      name: string;
      email: string;
      password: string;
      inviteToken?: string;
    };
    const result = await authService.register(name, email, password, inviteToken);

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/invites/:token
 */
export const getInviteDetails = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const details = await authService.getInviteDetails(String(req.params.token));
    res.status(200).json({ success: true, data: details });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login(email, password);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/refresh
 */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refreshToken(refreshToken);

    res.status(200).json({ success: true, data: { tokens } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { refreshToken } = req.body as { refreshToken: string };
    await authService.logout(user.id, refreshToken);

    res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/password-reset/request
 */
export const requestPasswordReset = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email } = req.body as { email: string };
    await authService.requestPasswordReset(email);

    // Always return 200 to prevent email enumeration
    res.status(200).json({
      success: true,
      data: { message: 'If that email is registered, a reset link has been sent' },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/password-reset/confirm
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { token, password } = req.body as { token: string; password: string };
    await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      data: { message: 'Password has been reset successfully' },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/google — placeholder for initiating Google OAuth flow
 */
export const googleAuth = async (
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Google OAuth not yet configured' },
  });
};

/**
 * GET /api/auth/google/callback — placeholder for Google OAuth callback
 */
export const googleAuthCallback = async (
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Google OAuth callback not yet configured' },
  });
};
