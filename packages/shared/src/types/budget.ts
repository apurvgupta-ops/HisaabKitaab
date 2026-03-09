export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';

export interface Budget {
  id: string;
  userId: string;
  categoryId: string | null;
  limitAmount: number;
  period: BudgetPeriod;
  alertThreshold: number;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetWithProgress extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  categoryName: string | null;
  categoryIcon: string | null;
}

export interface BudgetAlert {
  budgetId: string;
  categoryName: string;
  limitAmount: number;
  spent: number;
  percentage: number;
  message: string;
}
