import { z } from 'zod';
import { currencySchema } from './common.schema';

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  type: z.enum(['trip', 'home', 'couple', 'project', 'other']).default('other'),
  currency: currencySchema.default('USD'),
  settings: z
    .object({
      simplifyDebts: z.boolean().default(true),
      defaultSplitType: z.enum(['equal', 'percentage', 'exact', 'shares']).default('equal'),
      allowSettlements: z.boolean().default(true),
    })
    .optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['trip', 'home', 'couple', 'project', 'other']).optional(),
  currency: currencySchema.optional(),
  settings: z
    .object({
      simplifyDebts: z.boolean().optional(),
      defaultSplitType: z.enum(['equal', 'percentage', 'exact', 'shares']).optional(),
      allowSettlements: z.boolean().optional(),
    })
    .optional(),
});

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member']).default('member'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
