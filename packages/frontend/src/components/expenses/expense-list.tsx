"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ExpenseWithDetails, GroupMember } from "@splitwise/shared";
import { formatCurrency } from "@splitwise/shared";

import { useAppSelector } from "@/store/hooks";
import { useDeleteExpenseMutation } from "@/store/api/expenseApi";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ExpenseListProps {
  expenses: ExpenseWithDetails[];
  members: GroupMember[];
  currency: string;
  pagination?: {
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  onPageChange?: (page: number) => void;
  onEdit?: (expense: ExpenseWithDetails) => void;
}

const SPLIT_TYPE_LABELS: Record<string, string> = {
  equal: "Equal",
  percentage: "%",
  exact: "Exact",
  shares: "Shares",
};

function groupExpensesByDate(expenses: ExpenseWithDetails[]) {
  const grouped = new Map<string, ExpenseWithDetails[]>();

  for (const expense of expenses) {
    const dateKey = new Date(expense.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const existing = grouped.get(dateKey) ?? [];
    existing.push(expense);
    grouped.set(dateKey, existing);
  }

  return grouped;
}

function ExpenseRow({
  expense,
  currency,
  isCreator,
  onEdit,
}: {
  expense: ExpenseWithDetails;
  currency: string;
  isCreator: boolean;
  onEdit?: (expense: ExpenseWithDetails) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleteExpense, { isLoading: isDeleting }] = useDeleteExpenseMutation();
  const { toast } = useToast();

  const payerNames = expense.payers
    .map((p) => p.user?.name ?? "Unknown")
    .join(", ");

  const handleDelete = async () => {
    try {
      await deleteExpense(expense.id).unwrap();
      toast({ title: "Expense deleted", description: "The expense has been removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete expense.", variant: "destructive" });
    }
  };

  return (
    <div className="rounded-lg border transition-colors hover:bg-accent/30">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {expense.category ? (
            <span
              className="text-lg"
              style={{ color: expense.category.color }}
            >
              {expense.category.icon}
            </span>
          ) : (
            <Receipt className="h-4 w-4 text-primary" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{expense.description}</p>
          <p className="text-xs text-muted-foreground">
            Paid by {payerNames}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {SPLIT_TYPE_LABELS[expense.splitType] ?? expense.splitType}
          </Badge>
          <span className="text-sm font-semibold">
            {formatCurrency(expense.amount, currency)}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-3 pb-3 pt-2">
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase">
              Split Details
            </h4>
            {expense.splits.map((split) => (
              <div
                key={split.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {split.user?.name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{split.user?.name ?? "Unknown"}</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(split.amount, currency)}
                  {split.percentage != null && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({split.percentage}%)
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {isCreator && (
            <div className="mt-3 flex gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => onEdit?.(expense)}
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExpenseList({
  expenses,
  members: _members,
  currency,
  pagination,
  onPageChange,
  onEdit,
}: ExpenseListProps) {
  const currentUser = useAppSelector((s) => s.auth.user);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Receipt className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="mt-4 text-sm font-medium">No expenses yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add an expense to get started tracking costs.
        </p>
      </div>
    );
  }

  const grouped = groupExpensesByDate(expenses);

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([date, dateExpenses]) => (
        <div key={date}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {date}
          </h3>
          <div className="space-y-2">
            {dateExpenses.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                currency={currency}
                isCreator={expense.createdBy === currentUser?.id}
                onEdit={onEdit}
              />
            ))}
          </div>
        </div>
      ))}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrev}
            onClick={() => onPageChange?.(pagination.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNext}
            onClick={() => onPageChange?.(pagination.page + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
