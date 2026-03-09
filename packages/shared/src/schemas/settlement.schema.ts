import { z } from 'zod';
import { amountSchema, currencySchema, uuidSchema } from './common.schema';

export const createSettlementSchema = z.object({
  groupId: uuidSchema,
  toUserId: uuidSchema,
  amount: amountSchema,
  currency: currencySchema.default('USD'),
  paymentMethod: z.enum(['cash', 'bank_transfer', 'upi', 'stripe', 'razorpay', 'other']).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export const updateSettlementStatusSchema = z.object({
  status: z.enum(['confirmed', 'rejected']),
});

export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;
export type UpdateSettlementStatusInput = z.infer<typeof updateSettlementStatusSchema>;
