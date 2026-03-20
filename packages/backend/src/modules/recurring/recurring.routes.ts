import { Router } from 'express';
import { authenticate } from '../../middleware';
import { getRecurringExpenses } from './recurring.controller';
import type { AuthenticatedRequest } from '../../middleware';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

const asAuth =
  (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as AuthenticatedRequest, res, next);

router.get('/', authenticate, asAuth(getRecurringExpenses));

export default router;
