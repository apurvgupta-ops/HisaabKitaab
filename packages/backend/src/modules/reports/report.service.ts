import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../middleware/errorHandler';
import type { Prisma } from '@prisma/client';

interface ExportFilters {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}

async function checkMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) {
    throw AppError.forbidden('You are not a member of this group');
  }

  return membership;
}

/**
 * Escapes a value for safe inclusion in a CSV cell.
 * Wraps in double-quotes and escapes any inner double-quotes per RFC 4180.
 */
const csvEscape = (value: unknown): string => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const csvRow = (values: unknown[]): string =>
  values.map(csvEscape).join(',');

export const reportService = {
  /**
   * Generates a CSV string of all expenses in a group.
   * Columns: Date, Description, Amount, Currency, Category, Split Type, Paid By, Created By
   */
  async exportExpensesToCSV(
    groupId: string,
    userId: string,
    filters?: ExportFilters,
  ): Promise<string> {
    await checkMembership(groupId, userId);

    const where: Prisma.ExpenseWhereInput = { groupId };

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        payers: {
          include: {
            user: { select: { name: true } },
          },
        },
        category: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const header = csvRow([
      'Date',
      'Description',
      'Amount',
      'Currency',
      'Category',
      'Split Type',
      'Paid By',
      'Created By',
    ]);

    const rows = expenses.map((expense) => {
      const paidBy = expense.payers
        .map((p) => p.user.name)
        .join('; ');

      return csvRow([
        expense.date.toISOString().split('T')[0],
        expense.description,
        Number(expense.amount).toFixed(2),
        expense.currency,
        expense.category?.name ?? 'Uncategorized',
        expense.splitType,
        paidBy,
        expense.creator.name,
      ]);
    });

    return [header, ...rows].join('\n');
  },

  /**
   * Generates a CSV string of all personal transactions for a user.
   * Columns: Date, Type, Description, Amount, Currency, Category, Account
   */
  async exportTransactionsToCSV(
    userId: string,
    filters?: ExportFilters,
  ): Promise<string> {
    const where: Prisma.TransactionWhereInput = { userId };

    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) where.date.lte = new Date(filters.endDate);
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const header = csvRow([
      'Date',
      'Type',
      'Description',
      'Amount',
      'Currency',
      'Category',
      'Account',
    ]);

    const rows = transactions.map((txn) =>
      csvRow([
        txn.date.toISOString().split('T')[0],
        txn.type,
        txn.description,
        Number(txn.amount).toFixed(2),
        txn.currency,
        txn.category?.name ?? 'Uncategorized',
        txn.account,
      ]),
    );

    return [header, ...rows].join('\n');
  },

  /**
   * Generates a summary report object for group expenses.
   * This data structure can be consumed by a PDF generator in the future.
   */
  async generateExpenseReport(groupId: string, userId: string) {
    await checkMembership(groupId, userId);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true, currency: true },
    });

    if (!group) {
      throw AppError.notFound('Group');
    }

    const expenses = await prisma.expense.findMany({
      where: { groupId },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
        payers: {
          include: { user: { select: { id: true, name: true } } },
        },
        splits: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    const totalExpenses = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );

    const categoryMap = new Map<string, { name: string; total: number; count: number }>();
    for (const expense of expenses) {
      const catName = expense.category?.name ?? 'Uncategorized';
      const catId = expense.categoryId ?? 'uncategorized';
      const existing = categoryMap.get(catId) ?? { name: catName, total: 0, count: 0 };
      existing.total += Number(expense.amount);
      existing.count += 1;
      categoryMap.set(catId, existing);
    }

    const expensesByCategory = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        total: Math.round(c.total * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total);

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
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

    const memberBalances = members.map((m) => {
      const paid = paidMap.get(m.userId) ?? 0;
      const owed = owedMap.get(m.userId) ?? 0;
      return {
        userId: m.userId,
        userName: m.user.name,
        paid: Math.round(paid * 100) / 100,
        owed: Math.round(owed * 100) / 100,
        balance: Math.round((paid - owed) * 100) / 100,
      };
    });

    const topExpenses = expenses.slice(0, 10).map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      date: e.date,
      category: e.category?.name ?? 'Uncategorized',
    }));

    const dates = expenses.map((e) => e.date.getTime());
    const period = {
      start: dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : null,
      end: dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : null,
    };

    return {
      groupName: group.name,
      currency: group.currency,
      period,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      expensesByCategory,
      memberBalances,
      topExpenses,
    };
  },

  /**
   * Generates a personal financial report for a given period.
   * Aggregates income, expenses, savings, category breakdown, and monthly trend.
   */
  async generateFinancialReport(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const baseWhere: Prisma.TransactionWhereInput = {
      userId,
      date: { gte: start, lte: end },
    };

    const [incomeAgg, expenseAgg, byCategory, transactions] = await Promise.all([
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
      prisma.transaction.findMany({
        where: baseWhere,
        select: { type: true, amount: true, date: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);
    const netSavings = totalIncome - totalExpenses;

    const categoryIds = byCategory
      .map((c) => c.categoryId)
      .filter((id): id is string => id !== null);

    const categories =
      categoryIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, icon: true, color: true },
          })
        : [];

    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const categoryBreakdown = byCategory.map((c) => ({
      category: c.categoryId ? categoryMap.get(c.categoryId) ?? null : null,
      total: Math.round(Number(c._sum.amount ?? 0) * 100) / 100,
      count: c._count,
    }));

    // Monthly trend: aggregate income/expense per month
    const monthlyMap = new Map<
      string,
      { month: string; income: number; expenses: number }
    >();

    for (const txn of transactions) {
      const monthKey = `${txn.date.getFullYear()}-${String(txn.date.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyMap.get(monthKey) ?? {
        month: monthKey,
        income: 0,
        expenses: 0,
      };

      const amount = Number(txn.amount);
      if (txn.type === 'income') {
        entry.income += amount;
      } else {
        entry.expenses += amount;
      }
      monthlyMap.set(monthKey, entry);
    }

    const monthlyTrend = Array.from(monthlyMap.values()).map((m) => ({
      month: m.month,
      income: Math.round(m.income * 100) / 100,
      expenses: Math.round(m.expenses * 100) / 100,
      net: Math.round((m.income - m.expenses) * 100) / 100,
    }));

    const topExpenses = await prisma.transaction.findMany({
      where: { ...baseWhere, type: 'expense' },
      include: {
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { amount: 'desc' },
      take: 10,
    });

    return {
      period: { start: start.toISOString(), end: end.toISOString() },
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netSavings: Math.round(netSavings * 100) / 100,
      categoryBreakdown,
      monthlyTrend,
      topExpenses: topExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        category: e.category,
        account: e.account,
      })),
    };
  },
};
