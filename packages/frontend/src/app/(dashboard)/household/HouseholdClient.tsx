'use client';

import { useMemo, useState } from 'react';
import { Home, HandCoins, Scale, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@splitwise/shared';

import { useGetGroupsQuery } from '@/store/api/groupApi';
import { useGetHouseholdSummaryQuery } from '@/store/api/householdApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function SummarySkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-28 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-44 rounded bg-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="h-10 rounded bg-muted" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function HouseholdClient() {
  const { data: groups = [], isLoading: groupsLoading } = useGetGroupsQuery();

  const defaultGroup = useMemo(
    () => groups.find((group) => group.type === 'home' || group.type === 'couple') ?? groups[0],
    [groups],
  );

  const initialMonth = new Date().toISOString().slice(0, 7);
  const [groupId, setGroupId] = useState<string>('');
  const [month, setMonth] = useState<string>(initialMonth);

  const effectiveGroupId = groupId || defaultGroup?.id;

  const {
    data: summary,
    isLoading: summaryLoading,
    isError,
  } = useGetHouseholdSummaryQuery(
    {
      groupId: effectiveGroupId ?? '',
      month,
    },
    { skip: !effectiveGroupId },
  );

  const memberById = useMemo(() => {
    const entries = summary?.members ?? [];
    return new Map(entries.map((member) => [member.user.id, member.user.name]));
  }, [summary?.members]);

  if (groupsLoading) {
    return <SummarySkeleton />;
  }

  if (!groups.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Home className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">Create a group to unlock Household view</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Phase 1 starts by showing contribution fairness per group and month. Once you create a
          group, this page will show who paid more, who owes more, and where spending is going.
        </p>
      </div>
    );
  }

  if (summaryLoading) {
    return <SummarySkeleton />;
  }

  if (isError || !summary) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold">Unable to load household summary</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Try selecting another group or refreshing this page.
        </p>
      </div>
    );
  }

  const mostContributorName = summary.insights.mostContributingMemberId
    ? memberById.get(summary.insights.mostContributingMemberId)
    : null;
  const leastContributorName = summary.insights.leastContributingMemberId
    ? memberById.get(summary.insights.leastContributingMemberId)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Household</h1>
          <p className="mt-1 text-muted-foreground">
            Shared budgeting baseline: fairness, contributions, and category spending.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase text-muted-foreground">Group</p>
            <Select value={effectiveGroupId ?? ''} onValueChange={setGroupId}>
              <SelectTrigger className="w-full min-w-[220px]">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase text-muted-foreground">Month</p>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totals.totalExpenses, summary.group.currency)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Scale className="h-4 w-4" />
              Fair Share
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totals.fairSharePerMember, summary.group.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Per member this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <HandCoins className="h-4 w-4" />
              Unsettled Gap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.totals.unsettledAmount, summary.group.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Paid vs owed mismatch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contribution Signals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="font-medium">Top:</span> {mostContributorName ?? 'N/A'}
            </p>
            <p className="flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-rose-600" />
              <span className="font-medium">Needs settle:</span> {leastContributorName ?? 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fairness by Member</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.members.map((member) => {
                const positive = member.contributionDelta >= 0;
                return (
                  <div key={member.user.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{member.user.name}</p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                      <Badge variant={positive ? 'default' : 'destructive'}>
                        {positive ? '+' : ''}
                        {formatCurrency(member.contributionDelta, summary.group.currency)}
                      </Badge>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                      <p>
                        Paid:{' '}
                        <span className="text-foreground">
                          {formatCurrency(member.paid, summary.group.currency)}
                        </span>
                      </p>
                      <p>
                        Owed:{' '}
                        <span className="text-foreground">
                          {formatCurrency(member.owed, summary.group.currency)}
                        </span>
                      </p>
                      <p>
                        Net:{' '}
                        <span className="text-foreground">
                          {formatCurrency(member.netBalance, summary.group.currency)}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.categories.length === 0 && (
                <p className="text-sm text-muted-foreground">No expenses for this month yet.</p>
              )}
              {summary.categories.map((category) => (
                <div key={category.categoryId ?? 'uncategorized'} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{category.categoryName}</p>
                    <Badge variant="secondary">{category.percentage}%</Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{category.expenseCount} expense(s)</span>
                    <span>{formatCurrency(category.totalAmount, summary.group.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
