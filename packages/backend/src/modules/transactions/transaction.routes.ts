import { Router } from 'express';
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionFiltersSchema,
} from '@splitwise/shared';
import { authenticate, validate } from '../../middleware';
import {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getSummary,
} from './transaction.controller';

const router = Router();

router.get('/', authenticate, validate(transactionFiltersSchema, 'query'), getTransactions);
router.get('/summary', authenticate, getSummary);
router.post('/', authenticate, validate(createTransactionSchema), createTransaction);
router.get('/:id', authenticate, getTransactionById);
router.put('/:id', authenticate, validate(updateTransactionSchema), updateTransaction);
router.delete('/:id', authenticate, deleteTransaction);

export default router;
