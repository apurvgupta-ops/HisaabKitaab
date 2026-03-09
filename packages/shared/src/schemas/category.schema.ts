import { z } from 'zod';
import { uuidSchema } from './common.schema';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  icon: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code'),
  parentId: uuidSchema.nullable().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
