import { Router } from 'express';
import { createCategorySchema, updateCategorySchema } from '@splitwise/shared';
import { authenticate, validate } from '../../middleware';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from './category.controller';

const router = Router();

router.get('/', authenticate, getCategories);
router.post('/', authenticate, validate(createCategorySchema), createCategory);
router.put('/:id', authenticate, validate(updateCategorySchema), updateCategory);
router.delete('/:id', authenticate, deleteCategory);

export default router;
