import { Router } from 'express';
import { authenticate } from '../../middleware';
import {
  categorizeExpense,
  parseNaturalLanguageExpense,
  getFinancialInsights,
  chatWithAssistant,
} from './ai.controller';

const router = Router();

router.post('/categorize', authenticate, categorizeExpense);
router.post('/parse', authenticate, parseNaturalLanguageExpense);
router.get('/insights', authenticate, getFinancialInsights);
router.post('/chat', authenticate, chatWithAssistant);

export default router;
