import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { recurringService } from './recurring.service';

export const getRecurringExpenses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const expenses = await recurringService.getUserRecurringExpenses(req.user.id);
    res.json({ success: true, data: expenses });
  } catch (err) {
    next(err);
  }
};
