'use client';

import { useState } from 'react';
import { Plus, AlertTriangle, Pencil, Trash2, PiggyBank, Calendar } from 'lucide-react';

import {
  useGetBudgetsQuery,
  useGetBudgetAlertsQuery,
  useDeleteBudgetMutation,
} from '@/store/api/budgetApi';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CreateBudgetDialog } from '@/components/budgets/create-budget-dialog';
import { formatCurrency } from '@splitwise/shared';
import type { BudgetWithProgress, BudgetAlert } from '@splitwise/shared';

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

function getProgressColor(percentage: number): string {
  if (percentage > 100) return 'bg-red-500';
  if (percentage >= 80) return 'bg-orange-500';
  if (percentage >= 60) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

function getProgressBg(percentage: number): string {
  if (percentage > 100) return 'text-red-600';
  if (percentage >= 80) return 'text-orange-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-emerald-600';
}

function BudgetCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="bg-muted h-5 w-28 rounded" />
            <div className="bg-muted h-4 w-16 rounded" />
          </div>
          <div className="bg-muted h-8 w-16 rounded" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted h-3 w-full rounded-full" />
        <div className="flex justify-between">
          <div className="bg-muted h-4 w-20 rounded" />
          <div className="bg-muted h-4 w-20 rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
        <PiggyBank className="text-primary h-10 w-10" />
      </div>
      <h3 className="mt-6 text-lg font-semibold">No budgets yet</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        Create a budget to set spending limits and track your expenses by category.
      </p>
      <Button className="mt-6 gap-2" onClick={onCreateClick}>
        <Plus className="h-4 w-4" />
        Create Your First Budget
      </Button>
    </div>
  );
}

export default function BudgetsPage() {
  const { toast } = useToast();
  const { data: budgetsData, isLoading } = useGetBudgetsQuery();
  const { data: alertsData } = useGetBudgetAlertsQuery();
  const [deleteBudget] = useDeleteBudgetMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithProgress | null>(null);

  const budgets = budgetsData ?? [];
  const alerts = alertsData ?? [];

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id).unwrap();
      toast({ title: 'Budget deleted', description: 'Budget has been removed.' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete budget.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (budget: BudgetWithProgress) => {
    setEditingBudget(budget);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingBudget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Budgets</h1>
          <p className="text-muted-foreground mt-1">Set limits and track your spending</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Budget
        </Button>
      </div>

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                  Budget Alerts
                </p>
                <ul className="space-y-1">
                  {alerts.map((alert: BudgetAlert) => (
                    <li
                      key={alert.budgetId}
                      className="text-sm text-orange-700 dark:text-orange-400"
                    >
                      {alert.message} —{' '}
                      <span className="font-medium">
                        {formatCurrency(alert.spent)} / {formatCurrency(alert.limitAmount)} (
                        {Math.round(alert.percentage)}%)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BudgetCardSkeleton key={i} />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState onCreateClick={() => setDialogOpen(true)} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget: BudgetWithProgress) => {
            const pct = Math.min(budget.percentage, 150);
            const progressColor = getProgressColor(budget.percentage);
            const textColor = getProgressBg(budget.percentage);

            return (
              <Card key={budget.id} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="flex items-center gap-2 truncate text-base">
                        {budget.categoryIcon && (
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                            style={{ backgroundColor: '#f1f5f9' }}
                          >
                            {budget.categoryIcon}
                          </span>
                        )}
                        {budget.categoryName ?? 'Overall Budget'}
                      </CardTitle>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {PERIOD_LABELS[budget.period] ?? budget.period}
                        </Badge>
                        {budget.isOverBudget && (
                          <Badge variant="destructive" className="text-xs">
                            Over Budget
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(budget)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive h-8 w-8"
                        onClick={() => handleDelete(budget.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Progress bar */}
                  <div className="relative">
                    <Progress value={Math.min(pct, 100)} className="h-3" />
                    <div
                      className={`absolute inset-y-0 left-0 h-full rounded-full transition-all ${progressColor}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>

                  {/* Amounts */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Spent:{' '}
                      <span className={`font-semibold ${textColor}`}>
                        {formatCurrency(budget.spent)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      Limit:{' '}
                      <span className="text-foreground font-semibold">
                        {formatCurrency(budget.limitAmount)}
                      </span>
                    </span>
                  </div>

                  {/* Percentage */}
                  <div className="text-center">
                    <span className={`text-lg font-bold ${textColor}`}>
                      {Math.round(budget.percentage)}%
                    </span>
                    <span className="text-muted-foreground ml-1 text-xs">used</span>
                  </div>

                  {/* Remaining */}
                  {budget.remaining > 0 && (
                    <p className="text-muted-foreground text-center text-xs">
                      {formatCurrency(budget.remaining)} remaining
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <CreateBudgetDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingBudget={editingBudget}
      />
    </div>
  );
}
