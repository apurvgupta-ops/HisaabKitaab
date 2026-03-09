import { Router } from 'express';
import {
  createSettlementSchema,
  updateSettlementStatusSchema,
} from '@splitwise/shared';
import { authenticate, validate } from '../../middleware';
import {
  createSettlement,
  getGroupSettlements,
  getUserSettlements,
  updateSettlementStatus,
  getSimplifiedDebts,
} from './settlement.controller';

const router = Router();

router.post('/', authenticate, validate(createSettlementSchema), createSettlement);
router.get('/group/:groupId', authenticate, getGroupSettlements);
router.get('/group/:groupId/simplified', authenticate, getSimplifiedDebts);
router.get('/me', authenticate, getUserSettlements);
router.patch('/:id/status', authenticate, validate(updateSettlementStatusSchema), updateSettlementStatus);

export default router;
