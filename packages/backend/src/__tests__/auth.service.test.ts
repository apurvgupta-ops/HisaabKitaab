import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-token' }));

const mockPrismaUser = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.mock('../shared/database/prisma', () => ({
  prisma: {
    user: mockPrismaUser,
  },
}));

const mockRedis = {
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
};

jest.mock('../shared/cache/redis', () => ({
  redis: mockRedis,
}));

jest.mock('../shared/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
  },
}));

import { authService } from '../modules/auth/auth.service';
import { AppError } from '../middleware/errorHandler';

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockJwt.sign as jest.Mock).mockReturnValue('mock-access-token');
    mockRedis.set.mockResolvedValue('OK');
  });

  describe('register', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      avatar: null,
      preferredCurrency: 'USD',
    };

    it('should register a new user and return tokens', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrismaUser.create.mockResolvedValue(mockUser);

      const result = await authService.register('Test User', 'test@example.com', 'Password123!');

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: { name: 'Test User', email: 'test@example.com', passwordHash: 'hashed-password' },
        select: { id: true, email: true, name: true, avatar: true, preferredCurrency: true },
      });
      expect(result.user).toEqual(mockUser);
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBe('mock-uuid-token');
      expect(result.tokens.expiresIn).toBe(900);
    });

    it('should throw conflict error if email already exists', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        authService.register('Test User', 'test@example.com', 'Password123!'),
      ).rejects.toThrow(AppError);

      try {
        await authService.register('Test User', 'test@example.com', 'Password123!');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(409);
      }
    });

    it('should store the refresh token in Redis with correct TTL', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrismaUser.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        preferredCurrency: 'USD',
      });

      await authService.register('Test User', 'test@example.com', 'Password123!');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'refresh_token:user-1:mock-uuid-token',
        JSON.stringify({ userId: 'user-1', email: 'test@example.com' }),
        'EX',
        604800,
      );
    });
  });

  describe('login', () => {
    const mockUserWithHash = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      avatar: null,
      preferredCurrency: 'USD',
      passwordHash: 'hashed-password',
    };

    it('should authenticate a valid user and return tokens', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUserWithHash);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login('test@example.com', 'Password123!');

      expect(result.user.id).toBe('user-1');
      expect(result.tokens.accessToken).toBe('mock-access-token');
    });

    it('should throw unauthorized for non-existent user', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      try {
        await authService.login('nonexistent@example.com', 'Password123!');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(401);
      }
    });

    it('should throw unauthorized for wrong password', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUserWithHash);
      (mockBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'WrongPassword')).rejects.toThrow(
        AppError,
      );
    });

    it('should throw unauthorized for user without password hash (OAuth-only)', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        ...mockUserWithHash,
        passwordHash: null,
      });

      try {
        await authService.login('test@example.com', 'Password123!');
        fail('Should have thrown');
      } catch (err) {
        expect((err as AppError).statusCode).toBe(401);
      }
    });
  });

  describe('refreshToken', () => {
    it('should rotate the refresh token and return new tokens', async () => {
      mockRedis.keys.mockResolvedValue(['refresh_token:user-1:old-token']);
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ userId: 'user-1', email: 'test@example.com' }),
      );

      const result = await authService.refreshToken('old-token');

      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user-1:old-token');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-uuid-token');
    });

    it('should throw unauthorized for invalid refresh token', async () => {
      mockRedis.keys.mockResolvedValue([]);

      try {
        await authService.refreshToken('invalid-token');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(401);
      }
    });

    it('should throw unauthorized when stored data is missing', async () => {
      mockRedis.keys.mockResolvedValue(['refresh_token:user-1:token']);
      mockRedis.get.mockResolvedValue(null);

      try {
        await authService.refreshToken('token');
        fail('Should have thrown');
      } catch (err) {
        expect((err as AppError).statusCode).toBe(401);
      }
    });
  });

  describe('logout', () => {
    it('should delete the refresh token from Redis', async () => {
      await authService.logout('user-1', 'some-refresh-token');

      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user-1:some-refresh-token');
    });
  });

  describe('requestPasswordReset', () => {
    it('should generate a reset token for existing user', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({ id: 'user-1' });

      const token = await authService.requestPasswordReset('test@example.com');

      expect(token).toBe('mock-uuid-token');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'password_reset:mock-uuid-token',
        'user-1',
        'EX',
        3600,
      );
    });

    it('should return empty string for non-existent email (prevent enumeration)', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const token = await authService.requestPasswordReset('nonexistent@example.com');

      expect(token).toBe('');
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password and invalidate all refresh tokens', async () => {
      mockRedis.get.mockResolvedValue('user-1');
      (mockBcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockPrismaUser.update.mockResolvedValue({});
      mockRedis.keys.mockResolvedValue([
        'refresh_token:user-1:token-a',
        'refresh_token:user-1:token-b',
      ]);

      await authService.resetPassword('reset-token', 'NewPassword123!');

      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: 'new-hashed-password' },
      });
      expect(mockRedis.del).toHaveBeenCalledWith('password_reset:reset-token');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'refresh_token:user-1:token-a',
        'refresh_token:user-1:token-b',
      );
    });

    it('should throw bad request for invalid/expired reset token', async () => {
      mockRedis.get.mockResolvedValue(null);

      try {
        await authService.resetPassword('invalid-token', 'NewPassword123!');
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).statusCode).toBe(400);
      }
    });
  });
});
