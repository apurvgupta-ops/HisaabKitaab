import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../shared/database/prisma';
import { redis } from '../../shared/cache/redis';
import { env } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../shared/logger';
import { groupService } from '../groups/group.service';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_PREFIX = 'refresh_token:';
const RESET_TOKEN_PREFIX = 'password_reset:';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const RESET_TOKEN_TTL = 60 * 60; // 1 hour in seconds

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
    preferredCurrency: string;
  };
  tokens: TokenPair;
}

/**
 * Generates a JWT access token and a refresh token, persisting the
 * refresh token in Redis for rotation-based invalidation.
 */
const generateTokens = async (userId: string, email: string): Promise<TokenPair> => {
  const accessToken = jwt.sign({ sub: userId, email }, env.jwt.secret, { expiresIn: 900 });

  const refreshToken = uuidv4();
  const redisKey = `${REFRESH_TOKEN_PREFIX}${userId}:${refreshToken}`;
  await redis.set(redisKey, JSON.stringify({ userId, email }), 'EX', REFRESH_TOKEN_TTL);

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
};

/**
 * Strips the password hash from the user record and returns a safe
 * user object suitable for API responses.
 */
const sanitizeUser = (user: {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  preferredCurrency: string;
}) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  avatar: user.avatar,
  preferredCurrency: user.preferredCurrency,
});

export const authService = {
  /**
   * Registers a new user with bcrypt-hashed password and returns
   * the created user along with JWT tokens.
   */
  async register(
    name: string,
    email: string,
    password: string,
    inviteToken?: string,
  ): Promise<AuthResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      throw AppError.conflict('An account with this email already exists');
    }

    if (inviteToken) {
      const inviteDetails = await groupService.getInviteDetails(inviteToken);
      if (inviteDetails.email.trim().toLowerCase() !== normalizedEmail) {
        throw AppError.badRequest('This invite is for a different email address');
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, email: normalizedEmail, passwordHash },
      select: { id: true, email: true, name: true, avatar: true, preferredCurrency: true },
    });

    if (inviteToken) {
      await groupService.acceptInviteToken(inviteToken, normalizedEmail, user.id);
    }

    const tokens = await generateTokens(user.id, user.email);
    logger.info({ userId: user.id }, 'User registered');

    return { user: sanitizeUser(user), tokens };
  },

  /**
   * Authenticates a user by email/password and returns the user
   * with fresh JWT tokens.
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        preferredCurrency: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const tokens = await generateTokens(user.id, user.email);
    logger.info({ userId: user.id }, 'User logged in');

    return { user: sanitizeUser(user), tokens };
  },

  /**
   * Validates an existing refresh token stored in Redis, rotates it,
   * and returns a new token pair. The old token is deleted to prevent reuse.
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const keys = await redis.keys(`${REFRESH_TOKEN_PREFIX}*:${refreshToken}`);
    if (keys.length === 0) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const storedData = await redis.get(keys[0]!);
    if (!storedData) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const { userId, email } = JSON.parse(storedData) as { userId: string; email: string };

    // Delete the old refresh token (rotation)
    await redis.del(keys[0]!);

    const tokens = await generateTokens(userId, email);
    logger.info({ userId }, 'Refresh token rotated');

    return tokens;
  },

  /**
   * Removes a specific refresh token from Redis, effectively logging
   * the user out of that session.
   */
  async logout(userId: string, refreshToken: string): Promise<void> {
    const redisKey = `${REFRESH_TOKEN_PREFIX}${userId}:${refreshToken}`;
    await redis.del(redisKey);
    logger.info({ userId }, 'User logged out');
  },

  /**
   * Finds or creates a user by Google OAuth ID. If the user already exists,
   * updates their profile with the latest Google info.
   */
  async googleAuth(
    googleId: string,
    email: string,
    name: string,
    avatar: string | null,
  ): Promise<AuthResult> {
    let user = await prisma.user.findUnique({
      where: { googleId },
      select: { id: true, email: true, name: true, avatar: true, preferredCurrency: true },
    });

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({ where: { email } });
      if (existingByEmail) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId, avatar: avatar ?? existingByEmail.avatar },
          select: { id: true, email: true, name: true, avatar: true, preferredCurrency: true },
        });
      } else {
        user = await prisma.user.create({
          data: { googleId, email, name, avatar },
          select: { id: true, email: true, name: true, avatar: true, preferredCurrency: true },
        });
      }
    }

    const tokens = await generateTokens(user.id, user.email);
    logger.info({ userId: user.id }, 'Google auth completed');

    return { user: sanitizeUser(user), tokens };
  },

  /**
   * Generates a password-reset token, stores it in Redis with a 1-hour TTL,
   * and returns the token. The calling layer is responsible for dispatching
   * the email containing the reset link.
   */
  async requestPasswordReset(email: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      logger.warn({ email }, 'Password reset requested for non-existent email');
      return '';
    }

    const resetToken = uuidv4();
    const redisKey = `${RESET_TOKEN_PREFIX}${resetToken}`;
    await redis.set(redisKey, user.id, 'EX', RESET_TOKEN_TTL);

    logger.info({ userId: user.id }, 'Password reset token generated');
    return resetToken;
  },

  /**
   * Validates a password-reset token from Redis, hashes the new password,
   * and updates the user record. The token is consumed (deleted) after use.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const redisKey = `${RESET_TOKEN_PREFIX}${token}`;
    const userId = await redis.get(redisKey);

    if (!userId) {
      throw AppError.badRequest('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await redis.del(redisKey);

    // Invalidate all existing refresh tokens for this user
    const refreshKeys = await redis.keys(`${REFRESH_TOKEN_PREFIX}${userId}:*`);
    if (refreshKeys.length > 0) {
      await redis.del(...refreshKeys);
    }

    logger.info({ userId }, 'Password reset completed');
  },

  async getInviteDetails(token: string) {
    return groupService.getInviteDetails(token);
  },
};
