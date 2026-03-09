import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { userService } from './user.service';

/**
 * GET /api/users/me — gets current user profile
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const profile = await userService.getUserById(user.id);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/me — updates profile (name, avatar, preferredCurrency)
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { name, avatar, preferredCurrency } = req.body;
    const profile = await userService.updateProfile(user.id, {
      name,
      avatar,
      preferredCurrency,
    });
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/users/me/preferences — updates preferences (merged with existing)
 */
export const updatePreferences = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const preferences = req.body as Record<string, unknown>;
    const profile = await userService.updatePreferences(user.id, preferences);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/me — deletes user account
 */
export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    await userService.deleteAccount(user.id);
    res.status(200).json({
      success: true,
      data: { message: 'Account deleted successfully' },
    });
  } catch (err) {
    next(err);
  }
};
