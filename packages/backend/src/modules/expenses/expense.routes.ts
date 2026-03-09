import { Router } from 'express';
import {
  createExpenseSchema,
  updateExpenseSchema,
  expenseFiltersSchema,
} from '@splitwise/shared';
import { authenticate, validate } from '../../middleware';
import {
  createExpense,
  getExpense,
  getGroupExpenses,
  updateExpense,
  deleteExpense,
  getGroupBalances,
} from './expense.controller';

const router = Router();

router.post('/', authenticate, validate(createExpenseSchema), createExpense);
router.get('/group/:groupId', authenticate, validate(expenseFiltersSchema, 'query'), getGroupExpenses);
router.get('/group/:groupId/balances', authenticate, getGroupBalances);
router.get('/:id', authenticate, getExpense);
router.put('/:id', authenticate, validate(updateExpenseSchema), updateExpense);
router.delete('/:id', authenticate, deleteExpense);

export default router;
