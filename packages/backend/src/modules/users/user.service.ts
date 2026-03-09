import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../middleware/errorHandler';

/**
 * User fields to expose in API responses (excludes passwordHash and sensitive data).
 */
const userSelect = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  preferredCurrency: true,
  preferences: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type SafeUser = {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  preferredCurrency: string;
  preferences: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export interface UpdateProfileData {
  name?: string;
  avatar?: string | null;
  preferredCurrency?: string;
}

export interface UserGroupWithBalance {
  id: string;
  name: string;
  type: string;
  currency: string;
  role: string;
  joinedAt: Date;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export const userService = {
  /**
   * Fetches a user by ID, excluding passwordHash.
   * @throws AppError.notFound if user does not exist
   */
  async getUserById(id: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });

    if (!user) {
      throw AppError.notFound('User');
    }

    return user;
  },

  /**
   * Updates user profile fields (name, avatar, preferredCurrency).
   * Only updates provided fields.
   */
  async updateProfile(userId: string, data: UpdateProfileData): Promise<SafeUser> {
    const updateData: { name?: string; avatar?: string | null; preferredCurrency?: string } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.preferredCurrency !== undefined)
      updateData.preferredCurrency = data.preferredCurrency;

    if (Object.keys(updateData).length === 0) {
      return this.getUserById(userId);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: userSelect,
    });

    return user;
  },

  /**
   * Merges preferences JSON with existing user preferences.
   * Partial updates are supported — only provided keys are merged/overwritten.
   */
  async updatePreferences(
    userId: string,
    preferences: Record<string, unknown>,
  ): Promise<SafeUser> {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    if (!existing) {
      throw AppError.notFound('User');
    }

    const currentPrefs =
      typeof existing.preferences === 'object' && existing.preferences !== null
        ? (existing.preferences as Record<string, unknown>)
        : {};

    const merged = {
      ...currentPrefs,
      ...preferences,
    };

    const user = await prisma.user.update({
      where: { id: userId },
      data: { preferences: merged as any },
      select: userSelect,
    });

    return user;
  },

  /**
   * Deletes user account (hard delete). Cascading deletes handle related records.
   */
  async deleteAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw AppError.notFound('User');
    }

    await prisma.user.delete({
      where: { id: userId },
    });
  },

  /**
   * Returns all groups the user belongs to, with balance info (totalPaid, totalOwed, netBalance).
   */
  async getUserGroups(userId: string): Promise<UserGroupWithBalance[]> {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: true,
        user: true,
      },
    });

    const result: UserGroupWithBalance[] = [];

    for (const membership of memberships) {
      const groupId = membership.groupId;

      const [payersAgg, splitsAgg] = await Promise.all([
        prisma.expensePayer.aggregate({
          where: {
            userId,
            expense: { groupId },
          },
          _sum: { amount: true },
        }),
        prisma.expenseSplit.aggregate({
          where: {
            userId,
            expense: { groupId },
          },
          _sum: { amount: true },
        }),
      ]);

      const totalPaid = Number(payersAgg._sum.amount ?? 0);
      const totalOwed = Number(splitsAgg._sum.amount ?? 0);
      const netBalance = totalPaid - totalOwed;

      result.push({
        id: membership.group.id,
        name: membership.group.name,
        type: membership.group.type,
        currency: membership.group.currency,
        role: membership.role,
        joinedAt: membership.joinedAt,
        totalPaid,
        totalOwed,
        netBalance,
      });
    }

    return result;
  },
};
