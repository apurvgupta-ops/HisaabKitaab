'use client';

import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';

import {
  useGetTransactionsQuery,
  useGetTransactionSummaryQuery,
  useDeleteTransactionMutation,
} from '@/store/api/transactionApi';
import { useGetCategoriesQuery } from '@/store/api/categoryApi';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog';
import { formatCurrency } from '@splitwise/shared';
import type { Transaction, TransactionFilters, Category } from '@splitwise/shared';

function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
      <div className="bg-muted h-4 w-20 animate-pulse rounded" />
      <div className="bg-muted h-4 w-40 flex-1 animate-pulse rounded" />
      <div className="bg-muted h-5 w-24 animate-pulse rounded-full" />
      <div className="bg-muted h-4 w-20 animate-pulse rounded" />
      <div className="bg-muted h-4 w-24 animate-pulse rounded" />
      <div className="bg-muted h-8 w-16 animate-pulse rounded" />
    </div>
  );
}

function SummaryCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="bg-muted h-4 w-24 rounded" />
        <div className="bg-muted h-8 w-8 rounded" />
      </CardHeader>
      <CardContent>
        <div className="bg-muted h-7 w-28 rounded" />
      </CardContent>
    </Card>
  );
}

function EmptyState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
        <Wallet className="text-primary h-10 w-10" />
      </div>
      <h3 className="mt-6 text-lg font-semibold">No transactions yet</h3>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        Start tracking your income and expenses by adding your first transaction.
      </p>
      <Button className="mt-6 gap-2" onClick={onAddClick}>
        <Plus className="h-4 w-4" />
        Add Your First Transaction
      </Button>
    </div>
  );
}

export default function TransactionsPage() {
  const { toast } = useToast();

  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const filters: TransactionFilters = useMemo(() => {
    const f: TransactionFilters = { page, limit: 15 };
    if (typeFilter !== 'all') f.type = typeFilter as 'income' | 'expense';
    if (categoryFilter !== 'all') f.categoryId = categoryFilter;
    if (accountFilter !== 'all') f.account = accountFilter;
    if (searchQuery.trim()) f.search = searchQuery.trim();
    if (startDate) f.startDate = new Date(startDate).toISOString();
    if (endDate) f.endDate = new Date(endDate).toISOString();
    return f;
  }, [typeFilter, categoryFilter, accountFilter, searchQuery, startDate, endDate, page]);

  const { data: txData, isLoading } = useGetTransactionsQuery(filters);
  const { data: summaryData, isLoading: summaryLoading } = useGetTransactionSummaryQuery(
    startDate || endDate
      ? {
          ...(startDate && { startDate: new Date(startDate).toISOString() }),
          ...(endDate && { endDate: new Date(endDate).toISOString() }),
        }
      : undefined,
  );
  const { data: categoriesData } = useGetCategoriesQuery();
  const [deleteTransaction] = useDeleteTransactionMutation();

  const transactions = txData?.data ?? [];
  const pagination = txData?.pagination;
  const summary = summaryData;
  const categories = categoriesData ?? [];

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => map.set(cat.id, cat));
    return map;
  }, [categories]);

  const uniqueAccounts = useMemo(() => {
    const accounts = new Set<string>();
    transactions.forEach((tx) => accounts.add(tx.account));
    return Array.from(accounts);
  }, [transactions]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id).unwrap();
      toast({ title: 'Transaction deleted', description: 'Transaction has been removed.' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete transaction.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingTransaction(null);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transactions</h1>
          <p className="text-muted-foreground mt-1">Track your personal income and expenses</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Income
              </CardTitle>
              <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(summary.totalIncome)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Expenses
              </CardTitle>
              <ArrowDownCircle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Net Balance
              </CardTitle>
              <Wallet className="text-primary h-5 w-5" />
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${
                  summary.netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(summary.netBalance)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Type toggle */}
            <div className="bg-muted flex gap-1 rounded-lg p-1">
              {[
                { value: 'all', label: 'All' },
                { value: 'income', label: 'Income' },
                { value: 'expense', label: 'Expense' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTypeFilter(opt.value);
                    setPage(1);
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    typeFilter === opt.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <Calendar className="text-muted-foreground h-4 w-4" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-[140px]"
                placeholder="From"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-[140px]"
                placeholder="To"
              />
            </div>

            {/* Category */}
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Account */}
            <Select
              value={accountFilter}
              onValueChange={(v) => {
                setAccountFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-[150px]">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {uniqueAccounts.map((acc) => (
                  <SelectItem key={acc} value={acc}>
                    {acc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-9 pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      {isLoading ? (
        <Card>
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <TransactionRowSkeleton key={i} />
            ))}
          </div>
        </Card>
      ) : transactions.length === 0 ? (
        <EmptyState onAddClick={() => setDialogOpen(true)} />
      ) : (
        <Card>
          {/* Table Header */}
          <div className="bg-muted/50 text-muted-foreground hidden items-center gap-4 border-b px-4 py-3 text-xs font-medium uppercase tracking-wider sm:flex">
            <span className="w-24">Date</span>
            <span className="flex-1">Description</span>
            <span className="w-32">Category</span>
            <span className="w-24">Account</span>
            <span className="w-28 text-right">Amount</span>
            <span className="w-20 text-right">Actions</span>
          </div>

          {/* Transaction Rows */}
          <div className="divide-y">
            {transactions.map((tx) => {
              const category = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
              const isIncome = tx.type === 'income';

              return (
                <div
                  key={tx.id}
                  className="hover:bg-muted/30 flex flex-col gap-2 px-4 py-3 transition-colors sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="text-muted-foreground w-24 text-sm">{formatDate(tx.date)}</span>
                  <span className="flex-1 text-sm font-medium">{tx.description}</span>
                  <span className="w-32">
                    {category ? (
                      <Badge
                        variant="secondary"
                        className="gap-1"
                        style={{
                          borderColor: category.color + '40',
                          backgroundColor: category.color + '15',
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </span>
                  <span className="text-muted-foreground w-24 text-sm">{tx.account}</span>
                  <span
                    className={`w-28 text-right text-sm font-semibold ${
                      isIncome ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                  <div className="flex w-20 justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(tx)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={() => handleDelete(tx.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {(pagination.page - 1) * pagination.limit + 1}-
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{' '}
            transactions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <AddTransactionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}
