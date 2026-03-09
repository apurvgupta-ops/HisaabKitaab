import { Router } from 'express';
import { authenticate } from '../../middleware';
import {
  exportGroupCSV,
  exportTransactionsCSV,
  getExpenseReport,
  getFinancialReport,
} from './report.controller';

const router = Router();

router.get('/groups/:groupId/csv', authenticate, exportGroupCSV);
router.get('/transactions/csv', authenticate, exportTransactionsCSV);
router.get('/groups/:groupId/summary', authenticate, getExpenseReport);
router.get('/financial', authenticate, getFinancialReport);

export default router;
