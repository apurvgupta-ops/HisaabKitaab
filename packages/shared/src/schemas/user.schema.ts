import { z } from 'zod';
import { currencySchema } from './common.schema';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().nullable().optional(),
  preferredCurrency: currencySchema.optional(),
});

export const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().min(2).max(5).optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
      expenseAdded: z.boolean().optional(),
      settlementReceived: z.boolean().optional(),
      budgetAlert: z.boolean().optional(),
      weeklyReport: z.boolean().optional(),
    })
    .optional(),
  defaultSplitType: z.enum(['equal', 'percentage', 'exact', 'shares']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
