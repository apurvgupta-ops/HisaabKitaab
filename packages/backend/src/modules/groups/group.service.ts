import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../middleware/errorHandler';
import type { CreateGroupInput, UpdateGroupInput } from '@splitwise/shared';

const groupIncludeMembers = {
  members: {
    include: {
      user: {
        select: { id: true, email: true, name: true, avatar: true },
      },
    },
  },
} as const;

/** Group with members included */
export type GroupWithMembers = NonNullable<
  Awaited<ReturnType<typeof prisma.group.findFirst>>
> & {
  members: {
    id: string;
    groupId: string;
    userId: string;
    role: string;
    joinedAt: Date;
    user: { id: string; email: string; name: string; avatar: string | null };
  }[];
};

/** Group list item for getUserGroups */
export type UserGroupItem = GroupWithMembers & { myRole: string };

/**
 * Checks that userId is a member of the group. Throws if not.
 */
async function checkMembership(
  groupId: string,
  userId: string
): Promise<{ id: string; groupId: string; userId: string; role: string }> {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) {
    throw AppError.forbidden('You are not a member of this group');
  }

  return membership;
}

/**
 * Checks that userId is an admin of the group. Throws if not.
 */
async function checkAdmin(
  groupId: string,
  userId: string
): Promise<{ id: string; groupId: string; userId: string; role: string }> {
  const membership = await checkMembership(groupId, userId);

  if (membership.role !== 'admin') {
    throw AppError.forbidden('Admin access required');
  }

  return membership;
}

export const groupService = {
  checkMembership,
  checkAdmin,

  /**
   * Creates a group and adds the creator as an admin member.
   */
  async createGroup(
    userId: string,
    data: CreateGroupInput
  ): Promise<GroupWithMembers> {
    const group = await prisma.group.create({
      data: {
        name: data.name,
        type: data.type ?? 'other',
        currency: data.currency ?? 'USD',
        settings: (data.settings ?? {}) as any,
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'admin',
          },
        },
      },
      include: groupIncludeMembers,
    });

    return group as GroupWithMembers;
  },

  /**
   * Returns a group by ID if the user is a member. Includes members.
   */
  async getGroupById(groupId: string, userId: string): Promise<GroupWithMembers> {
    await checkMembership(groupId, userId);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: groupIncludeMembers,
    });

    if (!group) {
      throw AppError.notFound('Group');
    }

    return group as GroupWithMembers;
  },

  /**
   * Returns all groups the user belongs to.
   */
  async getUserGroups(userId: string): Promise<UserGroupItem[]> {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: groupIncludeMembers,
        },
      },
    });

    type MembershipItem = (typeof memberships)[number];
    return memberships.map((m: MembershipItem) => ({
      ...m.group,
      members: m.group.members,
      myRole: m.role,
    })) as UserGroupItem[];
  },

  /**
   * Updates a group. Only admins can update.
   */
  async updateGroup(
    groupId: string,
    userId: string,
    data: UpdateGroupInput
  ): Promise<GroupWithMembers> {
    await checkAdmin(groupId, userId);

    const updateData: Record<string, any> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.settings !== undefined)
      updateData.settings = data.settings as any;

    if (Object.keys(updateData).length === 0) {
      return this.getGroupById(groupId, userId);
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      include: groupIncludeMembers,
    });

    return group as GroupWithMembers;
  },

  /**
   * Deletes a group. Only admin can delete.
   */
  async deleteGroup(groupId: string, userId: string): Promise<void> {
    await checkAdmin(groupId, userId);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw AppError.notFound('Group');
    }

    await prisma.group.delete({
      where: { id: groupId },
    });
  },

  /**
   * Adds a member to the group by email. Admin only.
   */
  async addMember(
    groupId: string,
    adminUserId: string,
    email: string,
    role: 'admin' | 'member'
  ): Promise<GroupWithMembers> {
    await checkAdmin(groupId, adminUserId);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    if (!user) {
      throw AppError.notFound('User');
    }

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });

    if (existing) {
      throw AppError.conflict('User is already a member of this group');
    }

    await prisma.groupMember.create({
      data: {
        groupId,
        userId: user.id,
        role,
      },
    });

    return this.getGroupById(groupId, adminUserId);
  },

  /**
   * Removes a member from the group. Admin only. Cannot remove self if last admin.
   */
  async removeMember(
    groupId: string,
    adminUserId: string,
    targetUserId: string
  ): Promise<void> {
    await checkAdmin(groupId, adminUserId);

    if (targetUserId === adminUserId) {
      const adminCount = await prisma.groupMember.count({
        where: { groupId, role: 'admin' },
      });
      if (adminCount <= 1) {
        throw AppError.badRequest(
          'Cannot remove yourself as you are the last admin. Transfer admin role first or delete the group.'
        );
      }
    }

    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    if (!target) {
      throw AppError.notFound('Member');
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });
  },

  /**
   * Updates a member's role. Admin only.
   */
  async updateMemberRole(
    groupId: string,
    adminUserId: string,
    targetUserId: string,
    role: 'admin' | 'member'
  ): Promise<GroupWithMembers> {
    await checkAdmin(groupId, adminUserId);

    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: targetUserId } },
    });

    if (!target) {
      throw AppError.notFound('Member');
    }

    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      data: { role },
    });

    return this.getGroupById(groupId, adminUserId);
  },
};
