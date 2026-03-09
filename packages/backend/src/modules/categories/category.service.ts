import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../middleware/errorHandler';
import type { CreateCategoryInput, UpdateCategoryInput } from '@splitwise/shared';

export const categoryService = {
  /**
   * Returns all system categories plus the user's custom categories.
   */
  async getCategories(userId: string) {
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { isSystem: true },
          { userId },
        ],
      },
      include: {
        parent: { select: { id: true, name: true, icon: true, color: true } },
        children: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return categories;
  },

  /**
   * Creates a custom category owned by the user.
   */
  async createCategory(userId: string, data: CreateCategoryInput) {
    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
        select: { id: true },
      });

      if (!parent) {
        throw AppError.notFound('Parent category');
      }
    }

    const existing = await prisma.category.findFirst({
      where: {
        name: { equals: data.name, mode: 'insensitive' },
        OR: [{ isSystem: true }, { userId }],
      },
    });

    if (existing) {
      throw AppError.conflict('A category with this name already exists');
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
        parentId: data.parentId ?? null,
        userId,
        isSystem: false,
      },
      include: {
        parent: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    return category;
  },

  /**
   * Updates a custom category. System categories cannot be modified.
   */
  async updateCategory(categoryId: string, userId: string, data: UpdateCategoryInput) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw AppError.notFound('Category');
    }

    if (category.isSystem) {
      throw AppError.forbidden('System categories cannot be modified');
    }

    if (category.userId !== userId) {
      throw AppError.forbidden('You do not own this category');
    }

    if (data.name) {
      const existing = await prisma.category.findFirst({
        where: {
          id: { not: categoryId },
          name: { equals: data.name, mode: 'insensitive' },
          OR: [{ isSystem: true }, { userId }],
        },
      });

      if (existing) {
        throw AppError.conflict('A category with this name already exists');
      }
    }

    const updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
      },
      include: {
        parent: { select: { id: true, name: true, icon: true, color: true } },
      },
    });

    return updated;
  },

  /**
   * Deletes a custom category. System categories cannot be deleted.
   */
  async deleteCategory(categoryId: string, userId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw AppError.notFound('Category');
    }

    if (category.isSystem) {
      throw AppError.forbidden('System categories cannot be deleted');
    }

    if (category.userId !== userId) {
      throw AppError.forbidden('You do not own this category');
    }

    await prisma.category.delete({ where: { id: categoryId } });
  },
};
