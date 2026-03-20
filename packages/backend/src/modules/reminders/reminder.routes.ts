import { Router } from 'express';
import { authenticate } from '../../middleware';
import { getPendingDebts, sendNudge } from './reminder.controller';
import type { AuthenticatedRequest } from '../../middleware';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

const asAuth =
  (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthenticatedRequest, res, next);

router.get('/pending', authenticate, asAuth(getPendingDebts));
router.post('/nudge/:settlementId', authenticate, asAuth(sendNudge));

export default router;
