'use client';

import Link from 'next/link';
import {
  DollarSign,
  Users,
  TrendingDown,
  PiggyBank,
  Plus,
  UserPlus,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { type BudgetWithProgress, formatCurrency } from '@splitwise/shared';

import { useAppSelector } from '@/store/hooks';
import { useGetGroupsQuery } from '@/store/api/groupApi';
import { useGetTransactionsQuery, useGetTransactionSummaryQuery } from '@/store/api/transactionApi';
import { useGetBudgetsQuery } from '@/store/api/budgetApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface SummaryCardData {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

const quickActions = [
  {
    label: 'Add Expense',
    icon: Plus,
    href: '/groups',
    variant: 'default' as const,
  },
  {
    label: 'Create Group',
    icon: UserPlus,
    href: '/groups',
    variant: 'outline' as const,
  },
  {
    label: 'Record Payment',
    icon: CreditCard,
    href: '/transactions',
    variant: 'outline' as const,
  },
];

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="h-4 w-96 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="h-5 w-28 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Failed to load dashboard</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        We couldn&apos;t fetch your data. Please check your connection and try again.
      </p>
      <Button onClick={onRetry} variant="outline" className="mt-4 gap-2">
        <Loader2 className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const currency = user?.preferredCurrency ?? 'USD';
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const {
    data: groups,
    isLoading: groupsLoading,
    isError: groupsError,
    refetch: refetchGroups,
  } = useGetGroupsQuery();

  const {
    data: transactionsResult,
    isLoading: txLoading,
    isError: txError,
    refetch: refetchTx,
  } = useGetTransactionsQuery({ page: 1, limit: 5 });

  const {
    data: transactionSummary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useGetTransactionSummaryQuery();

  const {
    data: monthlySummary,
    isLoading: monthlySummaryLoading,
    isError: monthlySummaryError,
    refetch: refetchMonthlySummary,
  } = useGetTransactionSummaryQuery({
    startDate: monthStart.toISOString(),
    endDate: monthEnd.toISOString(),
  });

  const {
    data: budgets,
    isLoading: budgetsLoading,
    isError: budgetsError,
    refetch: refetchBudgets,
  } = useGetBudgetsQuery();

  const isLoading =
    groupsLoading || txLoading || budgetsLoading || summaryLoading || monthlySummaryLoading;
  const isError = groupsError || txError || budgetsError || summaryError || monthlySummaryError;

  const handleRetry = () => {
    refetchGroups();
    refetchTx();
    refetchSummary();
    refetchMonthlySummary();
    refetchBudgets();
  };

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <DashboardError onRetry={handleRetry} />;

  const txList = transactionsResult?.data ?? [];
  const monthlySpending = Number(monthlySummary?.totalExpenses ?? 0);
  const netBalance = Number(transactionSummary?.netBalance ?? 0);

  const budgetCount = budgets?.length ?? 0;
  const overBudgetCount =
    budgets?.filter((b: BudgetWithProgress) => (b.spent ?? 0) > Number(b.limitAmount ?? 0))
      .length ?? 0;

  const summaryCards: SummaryCardData[] = [
    {
      title: 'Total Balance',
      value: formatCurrency(netBalance, currency),
      description: 'Your net balance',
      icon: DollarSign,
    },
    {
      title: 'Groups',
      value: String(groups?.length ?? 0),
      description: `${groups?.length ?? 0} active group${(groups?.length ?? 0) !== 1 ? 's' : ''}`,
      icon: Users,
    },
    {
      title: 'This Month',
      value: formatCurrency(monthlySpending, currency),
      description: 'Total spending',
      icon: TrendingDown,
    },
    {
      title: 'Budget Status',
      value: overBudgetCount > 0 ? `${overBudgetCount} Over` : 'On Track',
      description: `${budgetCount} budget${budgetCount !== 1 ? 's' : ''} set`,
      icon: PiggyBank,
    },
  ];

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening with your expenses today.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="group hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions + Recent activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant={action.variant}
                  className="w-full justify-start gap-3"
                  size="lg"
                  asChild
                >
                  <Link href={action.href}>
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        action.variant === 'default' ? 'bg-primary-foreground/20' : 'bg-primary/10'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${action.variant === 'default' ? '' : 'text-primary'}`}
                      />
                    </div>
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Your latest transactions and updates</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-primary hover:text-primary/80"
                asChild
              >
                <Link href="/transactions">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {txList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <DollarSign className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium">No activity yet</p>
                <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                  Add an expense or create a group to get started!
                </p>
                <Button size="sm" className="mt-4 gap-2" asChild>
                  <Link href="/groups">
                    <Plus className="h-4 w-4" />
                    Add Expense
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {txList.slice(0, 5).map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center gap-4 rounded-lg border p-3 hover:bg-accent/50"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {tx.type === 'expense' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.account}
                        {tx.date && ` \u00b7 ${new Date(tx.date).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Badge
                      variant={tx.type === 'expense' ? 'destructive' : 'default'}
                      className="shrink-0"
                    >
                      {tx.type === 'expense' ? '-' : '+'}
                      {formatCurrency(Number(tx.amount), tx.currency ?? currency)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
