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
  type LucideIcon,
} from 'lucide-react';

import { useAppSelector } from '@/store/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface SummaryCard {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  trend: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const summaryCards: SummaryCard[] = [
  {
    title: 'Total Balance',
    value: '$0.00',
    description: 'Across all groups',
    icon: DollarSign,
    trend: 'neutral',
  },
  {
    title: 'Groups',
    value: '0',
    description: 'Active groups',
    icon: Users,
    trend: 'neutral',
  },
  {
    title: 'This Month',
    value: '$0.00',
    description: 'Total spending',
    icon: TrendingDown,
    trend: 'neutral',
  },
  {
    title: 'Budget Status',
    value: 'On Track',
    description: '0 budgets set',
    icon: PiggyBank,
    trend: 'neutral',
  },
];

interface ActivityItem {
  id: string;
  type: 'expense' | 'payment';
  description: string;
  amount: string | null;
  date: string;
  user: string;
}

const recentActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'expense',
    description: 'No recent activity yet. Add an expense to get started!',
    amount: null,
    date: '',
    user: '',
  },
];

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

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const firstName = user?.name?.split(' ')[0] ?? 'there';

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
        <p className="text-muted-foreground mt-1">
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
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
                  <Icon className="text-primary h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{card.value}</p>
                <div className="mt-1 flex items-center gap-1">
                  {card.trendValue && (
                    <span
                      className={
                        card.trend === 'up'
                          ? 'text-xs font-medium text-emerald-600'
                          : card.trend === 'down'
                            ? 'text-destructive text-xs font-medium'
                            : ''
                      }
                    >
                      {card.trendValue}
                    </span>
                  )}
                  <p className="text-muted-foreground text-xs">{card.description}</p>
                </div>
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
                <Link href="/activity">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity[0]?.amount === null ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
                  <DollarSign className="text-muted-foreground h-6 w-6" />
                </div>
                <p className="mt-4 text-sm font-medium">No activity yet</p>
                <p className="text-muted-foreground mt-1 max-w-[220px] text-xs">
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
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="hover:bg-accent/50 flex items-center gap-4 rounded-lg border p-3"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {activity.type === 'expense' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{activity.description}</p>
                      <p className="text-muted-foreground text-xs">
                        {activity.user}
                        {activity.date && ` \u00b7 ${activity.date}`}
                      </p>
                    </div>
                    {activity.amount && (
                      <Badge
                        variant={activity.type === 'expense' ? 'destructive' : 'default'}
                        className="shrink-0"
                      >
                        {activity.type === 'expense' ? '-' : '+'}
                        {activity.amount}
                      </Badge>
                    )}
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
