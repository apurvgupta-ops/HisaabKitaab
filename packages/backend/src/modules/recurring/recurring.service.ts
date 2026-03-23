import { prisma } from '../../shared/database/prisma';
import { logger } from '../../shared/logger';
import { emitToGroup } from '../../shared/socket/socketServer';

interface RecurringConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate: string | null;
}

/**
 * Calculates the next occurrence date based on frequency and interval.
 */
const getNextDate = (lastDate: Date, config: RecurringConfig): Date => {
  const next = new Date(lastDate);
  switch (config.frequency) {
    case 'daily':
      next.setDate(next.getDate() + config.interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7 * config.interval);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + config.interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + config.interval);
      break;
  }
  return next;
};

export const recurringService = {
  /**
   * Returns all recurring expenses for a user with their next due date.
   */
  async getUserRecurringExpenses(userId: string) {
    const expenses = await prisma.expense.findMany({
      where: {
        isRecurring: true,
        createdBy: userId,
      },
      include: {
        group: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true } },
        payers: { include: { user: { select: { id: true, name: true } } } },
        splits: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { date: 'desc' },
    });

    return expenses.map((e) => {
      const config = e.recurringConfig as RecurringConfig | null;
      const nextDue = config ? getNextDate(e.date, config) : null;
      return {
        ...e,
        amount: Number(e.amount),
        amountInBase: Number(e.amountInBase),
        nextDue,
        payers: e.payers.map((p) => ({ ...p, amount: Number(p.amount) })),
        splits: e.splits.map((s) => ({
          ...s,
          amount: s.amount ? Number(s.amount) : null,
          percentage: s.percentage ? Number(s.percentage) : null,
        })),
      };
    });
  },

  /**
   * Processes all recurring expenses that are due.
   * Creates new expense instances for each due recurring expense.
   */
  async processRecurringExpenses(): Promise<number> {
    const now = new Date();
    let created = 0;

    const recurringExpenses = await prisma.expense.findMany({
      where: { isRecurring: true },
      include: {
        payers: true,
        splits: true,
      },
    });

    for (const expense of recurringExpenses) {
      const config = expense.recurringConfig as RecurringConfig | null;
      if (!config) continue;

      if (config.endDate && new Date(config.endDate) < now) continue;

      const nextDue = getNextDate(expense.date, config);
      if (nextDue > now) continue;

      try {
        const newExpense = await prisma.expense.create({
          data: {
            groupId: expense.groupId,
            amount: expense.amount,
            currency: expense.currency,
            amountInBase: expense.amountInBase,
            description: expense.description,
            splitType: expense.splitType,
            categoryId: expense.categoryId,
            tags: expense.tags as string[],
            date: nextDue,
            createdBy: expense.createdBy,
            isRecurring: true,
            recurringConfig: expense.recurringConfig ?? undefined,
            payers: {
              create: expense.payers.map((p) => ({
                userId: p.userId,
                amount: p.amount,
              })),
            },
            splits: {
              create: expense.splits.map((s) => ({
                userId: s.userId,
                amount: s.amount,
                percentage: s.percentage,
                shares: s.shares,
              })),
            },
          },
        });

        await prisma.expense.update({
          where: { id: expense.id },
          data: { date: nextDue },
        });

        emitToGroup(expense.groupId, 'expense_added', {
          expenseId: newExpense.id,
          description: newExpense.description,
          amount: Number(newExpense.amount),
          currency: newExpense.currency,
          isRecurring: true,
        });

        created++;
      } catch (err) {
        logger.error({ err, expenseId: expense.id }, 'Failed to create recurring expense instance');
      }
    }

    logger.info({ count: created }, 'Recurring expenses processed');
    return created;
  },
};
