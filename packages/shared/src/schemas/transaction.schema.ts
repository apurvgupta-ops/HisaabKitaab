import { z } from 'zod';
import { amountSchema, currencySchema, paginationSchema, uuidSchema } from './common.schema';

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: amountSchema,
  currency: currencySchema.default('USD'),
  description: z.string().min(1, 'Description is required').max(500),
  categoryId: uuidSchema.nullable().optional(),
  account: z.string().min(1, 'Account is required').max(100),
  date: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  amount: amountSchema.optional(),
  currency: currencySchema.optional(),
  description: z.string().min(1).max(500).optional(),
  categoryId: uuidSchema.nullable().optional(),
  account: z.string().min(1).max(100).optional(),
  date: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const transactionFiltersSchema = paginationSchema.extend({
  type: z.enum(['income', 'expense']).optional(),
  categoryId: uuidSchema.optional(),
  account: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['date', 'amount', 'createdAt']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;
