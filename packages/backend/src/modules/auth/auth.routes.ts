import { Router } from 'express';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '@splitwise/shared';
import { validate, authenticate, authLimiter } from '../../middleware';
import {
  register,
  login,
  refresh,
  logout,
  requestPasswordReset,
  resetPassword,
  googleAuth,
  googleAuthCallback,
} from './auth.controller';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refresh);
router.post('/logout', authenticate, logout);

router.post('/password-reset/request', validate(passwordResetRequestSchema), requestPasswordReset);
router.post('/password-reset/confirm', validate(passwordResetConfirmSchema), resetPassword);

// Google OAuth placeholders — will be wired up with Passport.js
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

export default router;
