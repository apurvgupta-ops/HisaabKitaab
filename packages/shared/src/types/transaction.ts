export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  categoryId: string | null;
  account: string;
  metadata: Record<string, unknown>;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  account?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  byCategory: CategoryBreakdown[];
  byAccount: AccountBreakdown[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  total: number;
  count: number;
  percentage: number;
}

export interface AccountBreakdown {
  account: string;
  balance: number;
  income: number;
  expenses: number;
}
