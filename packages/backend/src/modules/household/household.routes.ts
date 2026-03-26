import { Router } from 'express';
import { authenticate } from '../../middleware';
import { getGroupHouseholdSummary } from './household.controller';

const router = Router();

router.get('/:groupId/summary', authenticate, getGroupHouseholdSummary);

export default router;
