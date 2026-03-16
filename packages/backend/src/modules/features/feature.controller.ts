import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { getFeatureFlagsForUser } from './feature.service';

/**
 * GET /api/features — returns evaluated feature flags for the current user.
 * Requires authentication.
 */
export const getFeatures = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const flags = await getFeatureFlagsForUser(user.id);
    res.status(200).json({ success: true, data: flags });
  } catch (err) {
    next(err);
  }
};
