import { Router } from 'express';
import { updateProfileSchema, updatePreferencesSchema } from '@splitwise/shared';
import { validate, authenticate } from '../../middleware';
import {
  getProfile,
  updateProfile,
  updatePreferences,
  deleteAccount,
} from './user.controller';

const router = Router();

/** All user routes require authentication */
router.get('/me', authenticate, getProfile);
router.put('/me', authenticate, validate(updateProfileSchema), updateProfile);
router.patch(
  '/me/preferences',
  authenticate,
  validate(updatePreferencesSchema),
  updatePreferences,
);
router.delete('/me', authenticate, deleteAccount);

export default router;
