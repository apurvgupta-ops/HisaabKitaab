import { prisma } from '../../shared/database/prisma';
import { getPeriodRange } from '@splitwise/shared';
import { AppError } from '../../middleware/errorHandler';
import type { CreateBudgetInput, UpdateBudgetInput } from '@splitwise/shared';

const budgetInclude = {
  category: { select: { id: true, name: true, icon: true, color: true } },
} as const;

const serialiseBudget = (budget: Record<string, unknown>) => ({
  ...budget,
  limitAmount: Number(budget.limitAmount),
  alertThreshold: Number(budget.alertThreshold),
});

async function checkOwnership(budgetId: string, userId: string) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    select: { id: true, userId: true },
  });

  if (!budget) {
    throw AppError.notFound('Budget');
  }

  if (budget.userId !== userId) {
    throw AppError.forbidden('You do not own this budget');
  }

  return budget;
}

/**
 * Calculates how much has been spent against a budget in the current period.
 * Queries expense-type transactions matching the budget's category
 * within the period derived from the budget's start date and period type.
 */
async function calculateBudgetProgress(budget: {
  id: string;
  userId: string;
  categoryId: string | null;
  period: string;
  startDate: Date;
  limitAmount: unknown;
  alertThreshold: unknown;
}) {
  const { start, end } = getPeriodRange(
    new Date(),
    budget.period as 'weekly' | 'monthly' | 'yearly',
  );

  const where: {
    userId: string;
    type: string;
    date: { gte: Date; lte: Date };
    categoryId?: string;
  } = {
    userId: budget.userId,
    type: 'expense',
    date: { gte: start, lte: end },
  };

  if (budget.categoryId) {
    where.categoryId = budget.categoryId;
  }

  const result = await prisma.transaction.aggregate({
    where,
    _sum: { amount: true },
  });

  const spent = Number(result._sum.amount ?? 0);
  const limit = Number(budget.limitAmount);
  const percentage = limit > 0 ? Math.round((spent / limit) * 10000) / 100 : 0;

  return {
    spent: Math.round(spent * 100) / 100,
    remaining: Math.round(Math.max(limit - spent, 0) * 100) / 100,
    percentage,
    periodStart: start,
    periodEnd: end,
    isOverBudget: spent > limit,
  };
}

export const budgetService = {
  /**
   * Creates a new budget for the authenticated user.
   */
  async createBudget(userId: string, data: CreateBudgetInput) {
    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId: data.categoryId ?? null,
        limitAmount: data.limitAmount,
        period: data.period,
        alertThreshold: data.alertThreshold,
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
      include: budgetInclude,
    });

    const serialised = serialiseBudget(budget as unknown as Record<string, unknown>);
    const progress = await calculateBudgetProgress({
      ...budget,
      period: budget.period,
    });

    return { ...serialised, progress };
  },

  /**
   * Returns all user budgets with current period progress.
   */
  async getBudgets(userId: string) {
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: budgetInclude,
      orderBy: { createdAt: 'desc' },
    });

    const results = await Promise.all(
      budgets.map(async (b) => {
        const serialised = serialiseBudget(b as unknown as Record<string, unknown>);
        const progress = await calculateBudgetProgress(b);
        return { ...serialised, progress };
      }),
    );

    return results;
  },

  /**
   * Returns a single budget with progress. Validates ownership.
   */
  async getBudgetById(id: string, userId: string) {
    await checkOwnership(id, userId);

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: budgetInclude,
    });

    if (!budget) {
      throw AppError.notFound('Budget');
    }

    const serialised = serialiseBudget(budget as unknown as Record<string, unknown>);
    const progress = await calculateBudgetProgress(budget);

    return { ...serialised, progress };
  },

  /**
   * Updates an existing budget. Validates ownership.
   */
  async updateBudget(id: string, userId: string, data: UpdateBudgetInput) {
    await checkOwnership(id, userId);

    const updateData: Record<string, unknown> = {};

    if (data.limitAmount !== undefined) updateData.limitAmount = data.limitAmount;
    if (data.period !== undefined) updateData.period = data.period;
    if (data.alertThreshold !== undefined) updateData.alertThreshold = data.alertThreshold;
    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    }
    if (data.categoryId !== undefined) {
      updateData.categoryId = data.categoryId ?? null;
    }

    const budget = await prisma.budget.update({
      where: { id },
      data: updateData,
      include: budgetInclude,
    });

    const serialised = serialiseBudget(budget as unknown as Record<string, unknown>);
    const progress = await calculateBudgetProgress(budget);

    return { ...serialised, progress };
  },

  /**
   * Deletes a budget. Validates ownership.
   */
  async deleteBudget(id: string, userId: string) {
    await checkOwnership(id, userId);
    await prisma.budget.delete({ where: { id } });
  },

  /**
   * Checks all user budgets and returns those that exceed their alert threshold.
   */
  async checkBudgetAlerts(userId: string) {
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: budgetInclude,
    });

    const alerts: { budget: Record<string, unknown>; progress: Awaited<ReturnType<typeof calculateBudgetProgress>> }[] = [];

    for (const b of budgets) {
      const progress = await calculateBudgetProgress(b);
      const threshold = Number(b.alertThreshold);

      if (progress.percentage >= threshold * 100) {
        alerts.push({
          budget: serialiseBudget(b as unknown as Record<string, unknown>),
          progress,
        });
      }
    }

    return alerts;
  },
};
