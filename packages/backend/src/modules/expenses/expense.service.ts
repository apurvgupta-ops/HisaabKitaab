import { prisma } from '../../shared/database/prisma';
import { cacheGet, cacheSet, cacheDeletePattern } from '../../shared/cache/redis';
import { splitEqually, buildPaginationMeta, getPrismaSkipTake } from '@splitwise/shared';
import { AppError } from '../../middleware/errorHandler';
import { emitToGroup } from '../../shared/socket/socketServer';
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFiltersInput,
} from '@splitwise/shared';
import type { Prisma } from '@prisma/client';

const BALANCE_CACHE_TTL = 300;

const expenseInclude = {
  payers: {
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  },
  splits: {
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  },
  category: {
    select: { id: true, name: true, icon: true, color: true },
  },
  creator: {
    select: { id: true, name: true, email: true, avatar: true },
  },
} as const;

/**
 * Serialises Prisma Decimal fields in an expense to plain numbers.
 */
const serialiseExpense = (expense: Record<string, unknown>) => ({
  ...expense,
  amount: Number(expense.amount),
  amountInBase: Number(expense.amountInBase),
  payers: (expense.payers as Record<string, unknown>[])?.map((p) => ({
    ...p,
    amount: Number(p.amount),
  })),
  splits: (expense.splits as Record<string, unknown>[])?.map((s) => ({
    ...s,
    amount: Number(s.amount),
    percentage: s.percentage != null ? Number(s.percentage) : null,
  })),
});

async function checkMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) {
    throw AppError.forbidden('You are not a member of this group');
  }

  return membership;
}

async function checkCreatorOrAdmin(expenseId: string, userId: string) {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    select: { id: true, groupId: true, createdBy: true },
  });

  if (!expense) {
    throw AppError.notFound('Expense');
  }

  if (expense.createdBy === userId) return expense;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: expense.groupId, userId } },
  });

  if (!membership || membership.role !== 'admin') {
    throw AppError.forbidden('Only the creator or a group admin can perform this action');
  }

  return expense;
}

async function invalidateBalanceCache(groupId: string) {
  await cacheDeletePattern(`group:${groupId}:balances*`);
}

export const expenseService = {
  /**
   * Creates an expense with payers and splits inside a transaction.
   * For "equal" split type, calculates equal amounts automatically.
   */
  async createExpense(userId: string, data: CreateExpenseInput) {
    await checkMembership(data.groupId, userId);

    let splitData = data.splits.map((s) => ({
      userId: s.userId,
      amount: s.amount ?? 0,
      percentage: s.percentage ?? null,
      shares: s.shares ?? null,
    }));

    if (data.splitType === 'equal') {
      const amounts = splitEqually(data.amount, splitData.length);
      splitData = splitData.map((s, i) => ({ ...s, amount: amounts[i]! }));
    }

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          groupId: data.groupId,
          amount: data.amount,
          currency: data.currency,
          amountInBase: data.amount,
          description: data.description,
          splitType: data.splitType,
          categoryId: data.categoryId ?? null,
          tags: data.tags ?? [],
          isRecurring: data.isRecurring,
          recurringConfig: data.recurringConfig ?? undefined,
          createdBy: userId,
          date: data.date ? new Date(data.date) : new Date(),
          payers: {
            createMany: {
              data: data.payers.map((p) => ({
                userId: p.userId,
                amount: p.amount,
              })),
            },
          },
          splits: {
            createMany: {
              data: splitData.map((s) => ({
                userId: s.userId,
                amount: s.amount,
                percentage: s.percentage,
                shares: s.shares,
              })),
            },
          },
        },
        include: expenseInclude,
      });

      return created;
    });

    await invalidateBalanceCache(data.groupId);

    const serialised = serialiseExpense(expense as unknown as Record<string, unknown>);
    emitToGroup(data.groupId, 'expense_added', serialised);

    return serialised;
  },

  /**
   * Returns a single expense with payers, splits, category and creator.
   * Validates group membership.
   */
  async getExpenseById(expenseId: string, userId: string) {
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: expenseInclude,
    });

    if (!expense) {
      throw AppError.notFound('Expense');
    }

    await checkMembership(expense.groupId, userId);

    return serialiseExpense(expense as unknown as Record<string, unknown>);
  },

  /**
   * Paginated, filterable list of expenses for a group.
   */
  async getGroupExpenses(groupId: string, userId: string, filters: ExpenseFiltersInput) {
    await checkMembership(groupId, userId);

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.ExpenseWhereInput = { groupId };

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.splitType) where.splitType = filters.splitType;

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.amount = {};
      if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount;
      if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount;
    }

    if (filters.search) {
      where.description = { contains: filters.search, mode: 'insensitive' };
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: expenseInclude,
        orderBy: { [filters.sortBy ?? 'date']: filters.sortOrder ?? 'desc' },
        ...getPrismaSkipTake(page, limit),
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      data: expenses.map((e) =>
        serialiseExpense(e as unknown as Record<string, unknown>),
      ),
      pagination: buildPaginationMeta(page, limit, total),
    };
  },

  /**
   * Updates an expense. Only the original creator or a group admin may update.
   * If payers or splits are provided they are re-created within a transaction.
   */
  async updateExpense(expenseId: string, userId: string, data: UpdateExpenseInput) {
    const existing = await checkCreatorOrAdmin(expenseId, userId);

    let splitData: { userId: string; amount: number; percentage: number | null; shares: number | null }[] | undefined;

    if (data.splits) {
      splitData = data.splits.map((s) => ({
        userId: s.userId,
        amount: s.amount ?? 0,
        percentage: s.percentage ?? null,
        shares: s.shares ?? null,
      }));

      const effectiveSplitType = data.splitType ?? 'equal';
      const effectiveAmount = data.amount ?? 0;

      if (effectiveSplitType === 'equal' && effectiveAmount > 0) {
        const amounts = splitEqually(effectiveAmount, splitData.length);
        splitData = splitData.map((s, i) => ({ ...s, amount: amounts[i]! }));
      }
    }

    const expense = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.ExpenseUpdateInput = {};

      if (data.amount !== undefined) {
        updateData.amount = data.amount;
        updateData.amountInBase = data.amount;
      }
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.splitType !== undefined) updateData.splitType = data.splitType;
      if (data.categoryId !== undefined) {
        updateData.category = data.categoryId
          ? { connect: { id: data.categoryId } }
          : { disconnect: true };
      }
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.date !== undefined) updateData.date = new Date(data.date);

      if (data.payers) {
        await tx.expensePayer.deleteMany({ where: { expenseId } });
        await tx.expensePayer.createMany({
          data: data.payers.map((p) => ({
            expenseId,
            userId: p.userId,
            amount: p.amount,
          })),
        });
      }

      if (splitData) {
        await tx.expenseSplit.deleteMany({ where: { expenseId } });
        await tx.expenseSplit.createMany({
          data: splitData.map((s) => ({
            expenseId,
            userId: s.userId,
            amount: s.amount,
            percentage: s.percentage,
            shares: s.shares,
          })),
        });
      }

      return tx.expense.update({
        where: { id: expenseId },
        data: updateData,
        include: expenseInclude,
      });
    });

    await invalidateBalanceCache(existing.groupId);

    const serialised = serialiseExpense(expense as unknown as Record<string, unknown>);
    emitToGroup(existing.groupId, 'expense_updated', serialised);

    return serialised;
  },

  /**
   * Deletes an expense. Only the creator or a group admin may delete.
   */
  async deleteExpense(expenseId: string, userId: string) {
    const existing = await checkCreatorOrAdmin(expenseId, userId);

    await prisma.expense.delete({ where: { id: expenseId } });

    await invalidateBalanceCache(existing.groupId);

    emitToGroup(existing.groupId, 'expense_deleted', { id: expenseId });
  },

  /**
   * Calculates net balances for every member in a group.
   * balance = sum(paid) - sum(owed). Positive means the user is owed money.
   * Results are cached in Redis.
   */
  async getGroupBalances(groupId: string, userId: string) {
    await checkMembership(groupId, userId);

    const cacheKey = `group:${groupId}:balances`;
    const cached = await cacheGet<Record<string, unknown>[]>(cacheKey);
    if (cached) return cached;

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    const payers = await prisma.expensePayer.findMany({
      where: { expense: { groupId } },
      select: { userId: true, amount: true },
    });

    const splits = await prisma.expenseSplit.findMany({
      where: { expense: { groupId } },
      select: { userId: true, amount: true },
    });

    const paidMap = new Map<string, number>();
    for (const p of payers) {
      paidMap.set(p.userId, (paidMap.get(p.userId) ?? 0) + Number(p.amount));
    }

    const owedMap = new Map<string, number>();
    for (const s of splits) {
      owedMap.set(s.userId, (owedMap.get(s.userId) ?? 0) + Number(s.amount));
    }

    const balances = members.map((m) => {
      const paid = paidMap.get(m.userId) ?? 0;
      const owed = owedMap.get(m.userId) ?? 0;
      return {
        user: m.user,
        paid: Math.round(paid * 100) / 100,
        owed: Math.round(owed * 100) / 100,
        balance: Math.round((paid - owed) * 100) / 100,
      };
    });

    await cacheSet(cacheKey, balances, BALANCE_CACHE_TTL);

    return balances;
  },
};
