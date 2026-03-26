import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { householdService } from './household.service';

export const getGroupHouseholdSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const monthQuery = req.query.month;
    const month = typeof monthQuery === 'string' ? monthQuery : undefined;

    const summary = await householdService.getGroupHouseholdSummary(
      String(req.params.groupId),
      user.id,
      month,
    );

    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};
