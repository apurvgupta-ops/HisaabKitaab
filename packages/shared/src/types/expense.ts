import type { SplitType, UserSummary } from './user';

export interface Expense {
  id: string;
  groupId: string;
  amount: number;
  currency: string;
  amountInBase: number;
  description: string;
  splitType: SplitType;
  categoryId: string | null;
  tags: string[];
  attachments: ExpenseAttachment[];
  isRecurring: boolean;
  recurringConfig: RecurringConfig | null;
  createdBy: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseAttachment {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface RecurringConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate: string | null;
}

export interface ExpensePayer {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  user?: UserSummary;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  percentage: number | null;
  shares: number | null;
  user?: UserSummary;
}

export interface ExpenseWithDetails extends Expense {
  payers: ExpensePayer[];
  splits: ExpenseSplit[];
  category?: { id: string; name: string; icon: string; color: string } | null;
  creator?: UserSummary;
}

export interface ExpenseFilters {
  groupId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  splitType?: SplitType;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
