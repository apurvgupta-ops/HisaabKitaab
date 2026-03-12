"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  DollarSign,
  Users,
  TrendingDown,
  PiggyBank,
  Receipt,
  Plus,
  UserPlus,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Handshake,
} from "lucide-react";
import { formatCurrency } from "@splitwise/shared";

import { useAppSelector } from "@/store/hooks";
import { useGetGroupsQuery } from "@/store/api/groupApi";
import { useGetGroupExpensesQuery } from "@/store/api/expenseApi";
import { useGetGroupBalancesQuery } from "@/store/api/expenseApi";
import { useGetBudgetsQuery } from "@/store/api/budgetApi";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const quickActions = [
  { label: "Add Expense", icon: Plus, href: "/groups", variant: "default" as const },
  { label: "Create Group", icon: UserPlus, href: "/groups", variant: "outline" as const },
  { label: "Record Payment", icon: CreditCard, href: "/transactions", variant: "outline" as const },
];

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const currentUser = useAppSelector((s) => s.auth.user);
  const firstName = currentUser?.name?.split(" ")[0] ?? "there";

  const { data: groupsRaw } = useGetGroupsQuery();
  const groups = Array.isArray(groupsRaw) ? groupsRaw : [];

  const firstThreeIds = groups.slice(0, 3).map((g) => g.id);

  const { data: exp0 } = useGetGroupExpensesQuery(
    { groupId: firstThreeIds[0] ?? "", limit: 10 },
    { skip: !firstThreeIds[0] },
  );
  const { data: exp1 } = useGetGroupExpensesQuery(
    { groupId: firstThreeIds[1] ?? "", limit: 10 },
    { skip: !firstThreeIds[1] },
  );
  const { data: exp2 } = useGetGroupExpensesQuery(
    { groupId: firstThreeIds[2] ?? "", limit: 10 },
    { skip: !firstThreeIds[2] },
  );

  const { data: bal0 } = useGetGroupBalancesQuery(firstThreeIds[0] ?? "", { skip: !firstThreeIds[0] });
  const { data: bal1 } = useGetGroupBalancesQuery(firstThreeIds[1] ?? "", { skip: !firstThreeIds[1] });
  const { data: bal2 } = useGetGroupBalancesQuery(firstThreeIds[2] ?? "", { skip: !firstThreeIds[2] });

  const { data: budgetsRaw } = useGetBudgetsQuery();
  const budgets = Array.isArray(budgetsRaw) ? budgetsRaw : [];

  const { totalBalance, totalExpensesThisMonth, totalExpenseCount } = useMemo(() => {
    let balance = 0;
    let monthSpending = 0;
    let expCount = 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const allBalances = [bal0, bal1, bal2];
    for (const balArr of allBalances) {
      if (!Array.isArray(balArr)) continue;
      for (const entry of balArr) {
        if (entry.user?.id === currentUser?.id) {
          balance += entry.balance;
        }
      }
    }

    const allExpenses = [exp0, exp1, exp2];
    for (const raw of allExpenses) {
      const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
      expCount += list.length;
      for (const exp of list) {
        const expDate = new Date(exp.date ?? exp.createdAt);
        if (expDate >= monthStart) {
          const myShare = exp.splits?.find((s: { userId?: string }) => s.userId === currentUser?.id);
          if (myShare) monthSpending += Number(myShare.amount);
        }
      }
    }

    return { totalBalance: balance, totalExpensesThisMonth: monthSpending, totalExpenseCount: expCount };
  }, [bal0, bal1, bal2, exp0, exp1, exp2, currentUser?.id]);

  const recentExpenses = useMemo(() => {
    const items: { id: string; description: string; amount: number; currency: string; date: string; actor: string; groupName: string; groupId: string; type: "expense" | "settlement"; isOutgoing: boolean }[] = [];
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    const allExp = [exp0, exp1, exp2];
    firstThreeIds.forEach((gId, idx) => {
      const raw = allExp[idx];
      const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
      const group = groupMap.get(gId);
      if (!group) return;
      for (const e of list) {
        const payerNames = e.payers?.map((p: { user?: { name?: string } }) => p.user?.name ?? "Someone").join(", ") ?? "Someone";
        items.push({
          id: e.id,
          description: e.description,
          amount: Number(e.amount),
          currency: group.currency ?? "USD",
          date: e.date ?? e.createdAt,
          actor: payerNames,
          groupName: group.name,
          groupId: gId,
          type: "expense",
          isOutgoing: e.payers?.some((p: { userId?: string }) => p.userId === currentUser?.id) ?? false,
        });
      }
    });

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 5);
  }, [exp0, exp1, exp2, groups, firstThreeIds, currentUser?.id]);

  const currency = currentUser?.preferredCurrency ?? "USD";
  const budgetOverBudget = budgets.filter((b: { spent?: number; limitAmount?: number }) => (b.spent ?? 0) >= (b.limitAmount ?? Infinity)).length;

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {greeting}, {firstName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening with your expenses today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="group hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Balance</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalBalance > 0 ? "text-emerald-600" : totalBalance < 0 ? "text-red-600" : ""}`}>
              {totalBalance >= 0 ? "+" : ""}{formatCurrency(totalBalance, currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalBalance > 0 ? "You are owed" : totalBalance < 0 ? "You owe" : "All settled up"}
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Groups</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{groups.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">Active groups</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalExpenseCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across all groups</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <TrendingDown className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalExpensesThisMonth, currency)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Your share of spending</p>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Budgets</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <PiggyBank className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {budgets.length === 0 ? "—" : budgetOverBudget > 0 ? `${budgetOverBudget} over` : "On Track"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {budgets.length} budget{budgets.length !== 1 ? "s" : ""} set
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
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
                        action.variant === "default" ? "bg-primary-foreground/20" : "bg-primary/10"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${action.variant === "default" ? "" : "text-primary"}`} />
                    </div>
                    {action.label}
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Your latest expenses across groups</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" asChild>
                <Link href="/activity">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
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
              <div className="space-y-2">
                {recentExpenses.map((item) => (
                  <Link
                    key={item.id}
                    href={`/groups/${item.groupId}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback
                        className={
                          item.isOutgoing
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }
                      >
                        {item.isOutgoing ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.actor} · {item.groupName} · {formatRelativeDate(item.date)}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {formatCurrency(item.amount, item.currency)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
