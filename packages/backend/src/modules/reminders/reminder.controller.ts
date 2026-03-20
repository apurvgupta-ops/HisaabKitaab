import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { reminderService } from './reminder.service';

export const getPendingDebts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const debts = await reminderService.getPendingDebts(req.user.id);
    res.json({ success: true, data: debts });
  } catch (err) {
    next(err);
  }
};

export const sendNudge = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { settlementId } = req.params as { settlementId: string };
    const result = await reminderService.sendNudge(req.user.id, settlementId);

    if (!result.sent) {
      res.status(400).json({ success: false, error: { message: result.message } });
      return;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
