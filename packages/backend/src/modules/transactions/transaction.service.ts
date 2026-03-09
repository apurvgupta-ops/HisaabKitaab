import { prisma } from '../../shared/database/prisma';
import { buildPaginationMeta, getPrismaSkipTake } from '@splitwise/shared';
import { AppError } from '../../middleware/errorHandler';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFiltersInput,
} from '@splitwise/shared';
import type { Prisma } from '@prisma/client';

const transactionInclude = {
  category: { select: { id: true, name: true, icon: true, color: true } },
} as const;

const serialiseTransaction = (txn: Record<string, unknown>) => ({
  ...txn,
  amount: Number(txn.amount),
});

async function checkOwnership(transactionId: string, userId: string) {
  const txn = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { id: true, userId: true },
  });

  if (!txn) {
    throw AppError.notFound('Transaction');
  }

  if (txn.userId !== userId) {
    throw AppError.forbidden('You do not own this transaction');
  }

  return txn;
}

export const transactionService = {
  /**
   * Creates a personal income/expense transaction.
   */
  async createTransaction(userId: string, data: CreateTransactionInput) {
    const txn = await prisma.transaction.create({
      data: {
        userId,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        categoryId: data.categoryId ?? null,
        account: data.account,
        date: data.date ? new Date(data.date) : new Date(),
        metadata: (data.metadata as Prisma.InputJsonValue) ?? {},
      },
      include: transactionInclude,
    });

    return serialiseTransaction(txn as unknown as Record<string, unknown>);
  },

  /**
   * Paginated, filterable list of user transactions.
   */
  async getTransactions(userId: string, filters: TransactionFiltersInput) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const where: Prisma.TransactionWhereInput = { userId };

    if (filters.type) where.type = filters.type;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.account) where.account = filters.account;

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

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: transactionInclude,
        orderBy: { [filters.sortBy ?? 'date']: filters.sortOrder ?? 'desc' },
        ...getPrismaSkipTake(page, limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map((t) =>
        serialiseTransaction(t as unknown as Record<string, unknown>),
      ),
      pagination: buildPaginationMeta(page, limit, total),
    };
  },

  /**
   * Returns a single transaction with ownership check.
   */
  async getTransactionById(id: string, userId: string) {
    await checkOwnership(id, userId);

    const txn = await prisma.transaction.findUnique({
      where: { id },
      include: transactionInclude,
    });

    return serialiseTransaction(txn as unknown as Record<string, unknown>);
  },

  /**
   * Updates a transaction. Ownership is validated.
   */
  async updateTransaction(id: string, userId: string, data: UpdateTransactionInput) {
    await checkOwnership(id, userId);

    const updateData: Prisma.TransactionUpdateInput = {};

    if (data.type !== undefined) updateData.type = data.type;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.account !== undefined) updateData.account = data.account;
    if (data.date !== undefined) updateData.date = new Date(data.date);
    if (data.metadata !== undefined) updateData.metadata = data.metadata as Prisma.InputJsonValue;
    if (data.categoryId !== undefined) {
      updateData.category = data.categoryId
        ? { connect: { id: data.categoryId } }
        : { disconnect: true };
    }

    const txn = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: transactionInclude,
    });

    return serialiseTransaction(txn as unknown as Record<string, unknown>);
  },

  /**
   * Deletes a transaction. Ownership is validated.
   */
  async deleteTransaction(id: string, userId: string) {
    await checkOwnership(id, userId);
    await prisma.transaction.delete({ where: { id } });
  },

  /**
   * Returns aggregated summary: total income, expenses, net balance,
   * and breakdowns by category and account within an optional date range.
   */
  async getSummary(userId: string, startDate?: string, endDate?: string) {
    const dateFilter: Prisma.TransactionWhereInput['date'] = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const hasDateFilter = startDate || endDate;
    const baseWhere: Prisma.TransactionWhereInput = {
      userId,
      ...(hasDateFilter ? { date: dateFilter } : {}),
    };

    const [incomeAgg, expenseAgg, byCategory, byAccount] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...baseWhere, type: 'income' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...baseWhere, type: 'expense' },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['categoryId'],
        where: { ...baseWhere, type: 'expense' },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
      }),
      prisma.transaction.groupBy({
        by: ['account'],
        where: baseWhere,
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);

    const categoryIds = byCategory
      .map((c) => c.categoryId)
      .filter((id): id is string => id !== null);

    const categories = categoryIds.length > 0
      ? await prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, icon: true, color: true },
        })
      : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netBalance: Math.round((totalIncome - totalExpenses) * 100) / 100,
      byCategory: byCategory.map((c) => ({
        category: c.categoryId ? categoryMap.get(c.categoryId) ?? null : null,
        total: Math.round(Number(c._sum.amount ?? 0) * 100) / 100,
        count: c._count,
      })),
      byAccount: byAccount.map((a) => ({
        account: a.account,
        total: Math.round(Number(a._sum.amount ?? 0) * 100) / 100,
        count: a._count,
      })),
    };
  },
};
