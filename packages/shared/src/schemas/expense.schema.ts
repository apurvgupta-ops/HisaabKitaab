import { z } from 'zod';
import { amountSchema, currencySchema, paginationSchema, uuidSchema } from './common.schema';

const payerSchema = z.object({
  userId: uuidSchema,
  amount: amountSchema,
});

const splitSchema = z.object({
  userId: uuidSchema,
  amount: amountSchema.optional(),
  percentage: z.number().min(0).max(100).optional(),
  shares: z.number().int().min(1).optional(),
});

export const createExpenseSchema = z
  .object({
    groupId: uuidSchema,
    amount: amountSchema,
    currency: currencySchema.default('USD'),
    description: z.string().min(1, 'Description is required').max(500),
    splitType: z.enum(['equal', 'percentage', 'exact', 'shares']),
    categoryId: uuidSchema.nullable().optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    date: z.string().datetime().optional(),
    payers: z.array(payerSchema).min(1, 'At least one payer is required'),
    splits: z.array(splitSchema).min(1, 'At least one split is required'),
    isRecurring: z.boolean().default(false),
    recurringConfig: z
      .object({
        frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
        interval: z.number().int().min(1).max(365),
        endDate: z.string().datetime().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      const payerTotal = data.payers.reduce((sum, p) => sum + p.amount, 0);
      return Math.abs(payerTotal - data.amount) < 0.01;
    },
    { message: 'Total payer amounts must equal the expense amount', path: ['payers'] }
  )
  .refine(
    (data) => {
      if (data.splitType === 'percentage') {
        const totalPct = data.splits.reduce((sum, s) => sum + (s.percentage ?? 0), 0);
        return Math.abs(totalPct - 100) < 0.01;
      }
      return true;
    },
    { message: 'Split percentages must sum to 100%', path: ['splits'] }
  )
  .refine(
    (data) => {
      if (data.splitType === 'exact') {
        const totalSplit = data.splits.reduce((sum, s) => sum + (s.amount ?? 0), 0);
        return Math.abs(totalSplit - data.amount) < 0.01;
      }
      return true;
    },
    { message: 'Split amounts must equal the expense amount', path: ['splits'] }
  );

export const updateExpenseSchema = z.object({
  amount: amountSchema.optional(),
  currency: currencySchema.optional(),
  description: z.string().min(1).max(500).optional(),
  splitType: z.enum(['equal', 'percentage', 'exact', 'shares']).optional(),
  categoryId: uuidSchema.nullable().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  date: z.string().datetime().optional(),
  payers: z.array(payerSchema).min(1).optional(),
  splits: z.array(splitSchema).min(1).optional(),
});

export const expenseFiltersSchema = paginationSchema.extend({
  groupId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  search: z.string().max(200).optional(),
  splitType: z.enum(['equal', 'percentage', 'exact', 'shares']).optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ExpenseFiltersInput = z.infer<typeof expenseFiltersSchema>;
