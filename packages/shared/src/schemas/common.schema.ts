import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidSchema = z.string().uuid('Invalid ID format');

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const currencySchema = z.string().length(3, 'Currency must be a 3-letter ISO code').toUpperCase();

export const amountSchema = z.number().positive('Amount must be positive').multipleOf(0.01, 'Amount can have at most 2 decimal places');
