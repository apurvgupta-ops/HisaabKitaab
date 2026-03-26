import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../middleware/errorHandler';
import { groupService } from '../groups/group.service';

interface HouseholdPeriod {
  month: string;
  startDate: string;
  endDate: string;
}

interface HouseholdGroupMeta {
  id: string;
  name: string;
  currency: string;
  memberCount: number;
}

interface HouseholdTotals {
  totalExpenses: number;
  totalPaid: number;
  totalOwed: number;
  fairSharePerMember: number;
  unsettledAmount: number;
}

interface HouseholdMemberSummary {
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  paid: number;
  owed: number;
  netBalance: number;
  fairShare: number;
  contributionDelta: number;
}

interface HouseholdCategorySummary {
  categoryId: string | null;
  categoryName: string;
  totalAmount: number;
  expenseCount: number;
  percentage: number;
}

interface HouseholdInsights {
  mostContributingMemberId: string | null;
  leastContributingMemberId: string | null;
}

export interface HouseholdSummary {
  group: HouseholdGroupMeta;
  period: HouseholdPeriod;
  totals: HouseholdTotals;
  members: HouseholdMemberSummary[];
  categories: HouseholdCategorySummary[];
  insights: HouseholdInsights;
}

function getMonthBounds(month?: string): { normalizedMonth: string; start: Date; end: Date } {
  const now = new Date();
  const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

  if (!month) {
    const year = now.getUTCFullYear();
    const monthIndex = now.getUTCMonth();
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
    const normalizedMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    return { normalizedMonth, start, end };
  }

  if (!monthRegex.test(month)) {
    throw AppError.badRequest('Invalid month format. Use YYYY-MM');
  }

  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return { normalizedMonth: month, start, end };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export const householdService = {
  async getGroupHouseholdSummary(
    groupId: string,
    userId: string,
    month?: string,
  ): Promise<HouseholdSummary> {
    await groupService.checkMembership(groupId, userId);
    const { normalizedMonth, start, end } = getMonthBounds(month);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw AppError.notFound('Group');
    }

    const [expenses, payers, splits] = await Promise.all([
      prisma.expense.findMany({
        where: {
          groupId,
          date: { gte: start, lte: end },
        },
        select: {
          id: true,
          amount: true,
          categoryId: true,
          category: { select: { name: true } },
        },
      }),
      prisma.expensePayer.findMany({
        where: {
          expense: {
            groupId,
            date: { gte: start, lte: end },
          },
        },
        select: {
          userId: true,
          amount: true,
        },
      }),
      prisma.expenseSplit.findMany({
        where: {
          expense: {
            groupId,
            date: { gte: start, lte: end },
          },
        },
        select: {
          userId: true,
          amount: true,
        },
      }),
    ]);

    const memberCount = group.members.length;
    const totalExpenses = round(expenses.reduce((sum, expense) => sum + Number(expense.amount), 0));
    const totalPaid = round(payers.reduce((sum, payer) => sum + Number(payer.amount), 0));
    const totalOwed = round(splits.reduce((sum, split) => sum + Number(split.amount), 0));
    const fairSharePerMember = memberCount > 0 ? round(totalExpenses / memberCount) : 0;
    const unsettledAmount = round(Math.abs(totalPaid - totalOwed));

    const paidByMember = new Map<string, number>();
    for (const payer of payers) {
      paidByMember.set(
        payer.userId,
        round((paidByMember.get(payer.userId) ?? 0) + Number(payer.amount)),
      );
    }

    const owedByMember = new Map<string, number>();
    for (const split of splits) {
      owedByMember.set(
        split.userId,
        round((owedByMember.get(split.userId) ?? 0) + Number(split.amount)),
      );
    }

    const members: HouseholdMemberSummary[] = group.members.map((member) => {
      const paid = round(paidByMember.get(member.userId) ?? 0);
      const owed = round(owedByMember.get(member.userId) ?? 0);
      const netBalance = round(paid - owed);
      const contributionDelta = round(paid - fairSharePerMember);

      return {
        user: member.user,
        paid,
        owed,
        netBalance,
        fairShare: fairSharePerMember,
        contributionDelta,
      };
    });

    const categoryMap = new Map<
      string,
      { categoryId: string | null; categoryName: string; totalAmount: number; expenseCount: number }
    >();
    for (const expense of expenses) {
      const key = expense.categoryId ?? 'uncategorized';
      const current = categoryMap.get(key) ?? {
        categoryId: expense.categoryId,
        categoryName: expense.category?.name ?? 'Uncategorized',
        totalAmount: 0,
        expenseCount: 0,
      };
      current.totalAmount += Number(expense.amount);
      current.expenseCount += 1;
      categoryMap.set(key, current);
    }

    const categories: HouseholdCategorySummary[] = Array.from(categoryMap.values())
      .map((entry) => ({
        categoryId: entry.categoryId,
        categoryName: entry.categoryName,
        totalAmount: round(entry.totalAmount),
        expenseCount: entry.expenseCount,
        percentage: totalExpenses > 0 ? round((entry.totalAmount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const sortedByContribution = [...members].sort(
      (a, b) => b.contributionDelta - a.contributionDelta,
    );

    const insights: HouseholdInsights = {
      mostContributingMemberId: sortedByContribution[0]?.user.id ?? null,
      leastContributingMemberId:
        sortedByContribution[sortedByContribution.length - 1]?.user.id ?? null,
    };

    return {
      group: {
        id: group.id,
        name: group.name,
        currency: group.currency,
        memberCount,
      },
      period: {
        month: normalizedMonth,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      totals: {
        totalExpenses,
        totalPaid,
        totalOwed,
        fairSharePerMember,
        unsettledAmount,
      },
      members,
      categories,
      insights,
    };
  },
};
