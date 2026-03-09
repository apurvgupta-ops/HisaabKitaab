import { Router } from 'express';
import { authenticate } from '../../middleware';
import {
  categorizeExpense,
  parseNaturalLanguageExpense,
  getFinancialInsights,
} from './ai.controller';

const router = Router();

router.post('/categorize', authenticate, categorizeExpense);
router.post('/parse', authenticate, parseNaturalLanguageExpense);
router.get('/insights', authenticate, getFinancialInsights);

export default router;
