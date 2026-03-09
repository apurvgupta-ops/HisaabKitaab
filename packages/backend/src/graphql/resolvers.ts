import { GraphQLError } from 'graphql';
import { userService } from '../modules/users/user.service';
import { groupService } from '../modules/groups/group.service';
import { expenseService } from '../modules/expenses/expense.service';
import { settlementService } from '../modules/settlements/settlement.service';
import { transactionService } from '../modules/transactions/transaction.service';
import { budgetService } from '../modules/budgets/budget.service';
import { categoryService } from '../modules/categories/category.service';
import { prisma } from '../shared/database/prisma';

interface GqlContext {
  user: { id: string; email: string } | null;
}

/**
 * Throws an UNAUTHENTICATED GraphQL error when there is no user in context.
 */
const requireAuth = (ctx: GqlContext): { id: string; email: string } => {
  if (!ctx.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return ctx.user;
};

export const resolvers = {
  Query: {
    me: async (_: unknown, __: unknown, ctx: GqlContext) => {
      const user = requireAuth(ctx);
      return userService.getUserById(user.id);
    },

    groups: async (_: unknown, __: unknown, ctx: GqlContext) => {
      const user = requireAuth(ctx);
      return groupService.getUserGroups(user.id);
    },

    group: async (_: unknown, args: { id: string }, ctx: GqlContext) => {
      const user = requireAuth(ctx);
      return groupService.getGroupById(args.id, user.id);
    },

    groupExpenses: async (
      _: unknown,
      args: { groupId: string; page?: number; limit?: number },
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      const result = await expenseService.getGroupExpenses(
        args.groupId,
        user.id,
        { page: args.page ?? 1, limit: args.limit ?? 20, sortBy: 'date' as const, sortOrder: 'desc' as const },
      );
      return {
        data: result.data,
        total: result.pagination.total,
        page: result.pagination.page,
        totalPages: result.pagination.totalPages,
      };
    },

    groupBalances: async (
      _: unknown,
      args: { groupId: string },
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      const balances = await expenseService.getGroupBalances(
        args.groupId,
        user.id,
      );
      return (balances as Record<string, unknown>[]).map((b) => ({
        userId: (b.user as Record<string, unknown>).id,
        userName: (b.user as Record<string, unknown>).name,
        balance: b.balance,
      }));
    },

    simplifiedDebts: async (
      _: unknown,
      args: { groupId: string },
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      const debts = await settlementService.getSimplifiedDebts(
        args.groupId,
        user.id,
      );
      return (debts as Record<string, unknown>[]).map((d) => {
        const from = d.from as Record<string, unknown>;
        const to = d.to as Record<string, unknown>;
        return {
          from: from.id,
          fromName: from.name,
          to: to.id,
          toName: to.name,
          amount: d.amount,
        };
      });
    },

    transactions: async (
      _: unknown,
      args: { page?: number; limit?: number; type?: string },
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      const result = await transactionService.getTransactions(user.id, {
        page: args.page ?? 1,
        limit: args.limit ?? 20,
        type: args.type as 'income' | 'expense' | undefined,
        sortBy: 'date' as const,
        sortOrder: 'desc' as const,
      });
      return {
        data: result.data,
        total: result.pagination.total,
        page: result.pagination.page,
        totalPages: result.pagination.totalPages,
      };
    },

    transactionSummary: async (
      _: unknown,
      args: { startDate?: string; endDate?: string },
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      return transactionService.getSummary(
        user.id,
        args.startDate,
        args.endDate,
      );
    },

    budgets: async (_: unknown, __: unknown, ctx: GqlContext) => {
      const user = requireAuth(ctx);
      const budgets = await budgetService.getBudgets(user.id);
      return budgets.map((b) => {
        const raw = b as Record<string, unknown>;
        const progress = raw.progress as Record<string, unknown>;
        return {
          id: raw.id,
          categoryId: raw.categoryId,
          limitAmount: raw.limitAmount,
          period: raw.period,
          spent: progress.spent,
          remaining: progress.remaining,
          percentage: progress.percentage,
        };
      });
    },

    categories: async (_: unknown, __: unknown, ctx: GqlContext) => {
      const user = requireAuth(ctx);
      return categoryService.getCategories(user.id);
    },
  },

  Mutation: {
    createGroup: async (
      _: unknown,
      args: { input: { name: string; type?: string; currency?: string } },
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      return groupService.createGroup(user.id, {
        name: args.input.name,
        type: (args.input.type || 'other') as 'trip' | 'home' | 'couple' | 'project' | 'other',
        currency: args.input.currency || 'USD',
      });
    },

    createExpense: async (
      _: unknown,
      args: {
        input: {
          groupId: string;
          amount: number;
          currency?: string;
          description: string;
          splitType: string;
          payers: { userId: string; amount: number }[];
          splits: {
            userId: string;
            amount?: number;
            percentage?: number;
            shares?: number;
          }[];
        };
      },
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      return expenseService.createExpense(user.id, {
        ...args.input,
        currency: args.input.currency ?? 'USD',
        splitType: args.input.splitType as 'equal' | 'percentage' | 'exact' | 'shares',
        isRecurring: false,
      });
    },

    createSettlement: async (
      _: unknown,
      args: {
        input: {
          groupId: string;
          toUserId: string;
          amount: number;
          currency?: string;
        };
      },
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      return settlementService.createSettlement(user.id, {
        ...args.input,
        currency: args.input.currency ?? 'USD',
      });
    },

    createTransaction: async (
      _: unknown,
      args: {
        input: {
          type: string;
          amount: number;
          currency?: string;
          description: string;
          categoryId?: string;
          account: string;
        };
      },
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      return transactionService.createTransaction(user.id, {
        ...args.input,
        type: args.input.type as 'income' | 'expense',
        currency: args.input.currency ?? 'USD',
      });
    },
  },

  /**
   * Field-level resolvers for nested Group fields that require
   * additional DB queries beyond what the service returns.
   */
  Group: {
    expenses: async (
      parent: { id: string },
      _: unknown,
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      const result = await expenseService.getGroupExpenses(
        parent.id,
        user.id,
        { page: 1, limit: 50, sortBy: 'date' as const, sortOrder: 'desc' as const },
      );
      return result.data;
    },

    balances: async (
      parent: { id: string },
      _: unknown,
      ctx: GqlContext,
    ) => {
      const user = requireAuth(ctx);
      const balances = await expenseService.getGroupBalances(
        parent.id,
        user.id,
      );
      return (balances as Record<string, unknown>[]).map((b) => ({
        userId: (b.user as Record<string, unknown>).id,
        userName: (b.user as Record<string, unknown>).name,
        balance: b.balance,
      }));
    },
  },

  Expense: {
    date: (parent: { date: string | Date }) =>
      parent.date instanceof Date
        ? parent.date.toISOString()
        : parent.date,
  },

  Settlement: {
    settledAt: (parent: { settledAt: string | Date }) =>
      parent.settledAt instanceof Date
        ? parent.settledAt.toISOString()
        : parent.settledAt,
  },

  Transaction: {
    date: (parent: { date: string | Date }) =>
      parent.date instanceof Date
        ? parent.date.toISOString()
        : parent.date,

    category: async (parent: { categoryId?: string | null }) => {
      if (!parent.categoryId) return null;
      return prisma.category.findUnique({
        where: { id: parent.categoryId },
        select: { id: true, name: true, icon: true, color: true },
      });
    },
  },
};
