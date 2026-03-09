import { z } from 'zod';
import { amountSchema, uuidSchema } from './common.schema';

export const createBudgetSchema = z.object({
  categoryId: uuidSchema.nullable().optional(),
  limitAmount: amountSchema,
  period: z.enum(['weekly', 'monthly', 'yearly']),
  alertThreshold: z.number().min(0).max(1).default(0.8),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export const updateBudgetSchema = z.object({
  categoryId: uuidSchema.nullable().optional(),
  limitAmount: amountSchema.optional(),
  period: z.enum(['weekly', 'monthly', 'yearly']).optional(),
  alertThreshold: z.number().min(0).max(1).optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
