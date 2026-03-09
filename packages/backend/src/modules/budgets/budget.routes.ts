import { Router } from 'express';
import { createBudgetSchema, updateBudgetSchema } from '@splitwise/shared';
import { authenticate, validate } from '../../middleware';
import {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  checkBudgetAlerts,
} from './budget.controller';

const router = Router();

router.get('/', authenticate, getBudgets);
router.get('/alerts', authenticate, checkBudgetAlerts);
router.post('/', authenticate, validate(createBudgetSchema), createBudget);
router.get('/:id', authenticate, getBudgetById);
router.put('/:id', authenticate, validate(updateBudgetSchema), updateBudget);
router.delete('/:id', authenticate, deleteBudget);

export default router;
