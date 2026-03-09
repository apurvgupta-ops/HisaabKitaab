"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Download,
  BarChart3,
  PieChartIcon,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  useGetTransactionsQuery,
  useGetTransactionSummaryQuery,
} from "@/store/api/transactionApi";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatCurrency } from "@splitwise/shared";
import type { Transaction } from "@splitwise/shared";

const CHART_COLORS = [
  "#10b981", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16",
  "#6366f1", "#d946ef",
];

type PeriodKey = "week" | "month" | "year" | "custom";

function getDateRange(period: PeriodKey): { startDate: string; endDate: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;

  switch (period) {
    case "week": {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case "month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "year": {
      start = new Date(now.getFullYear(), 0, 1);
      break;
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

interface CashFlowPoint {
  label: string;
  income: number;
  expense: number;
}

interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

function buildCashFlowData(transactions: Transaction[], period: PeriodKey): CashFlowPoint[] {
  const grouped = new Map<string, { income: number; expense: number }>();

  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    let key: string;

    if (period === "year") {
      key = d.toLocaleDateString("en-US", { month: "short" });
    } else if (period === "month") {
      key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else {
      key = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
    }

    const entry = grouped.get(key) ?? { income: 0, expense: 0 };
    if (tx.type === "income") {
      entry.income += tx.amount;
    } else {
      entry.expense += tx.amount;
    }
    grouped.set(key, entry);
  });

  return Array.from(grouped.entries()).map(([label, data]) => ({
    label,
    income: Math.round(data.income * 100) / 100,
    expense: Math.round(data.expense * 100) / 100,
  }));
}

function buildCategoryBreakdown(transactions: Transaction[]): CategorySlice[] {
  const grouped = new Map<string, number>();

  transactions
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      const name = tx.categoryId ?? "Uncategorized";
      grouped.set(name, (grouped.get(name) ?? 0) + tx.amount);
    });

  return Array.from(grouped.entries())
    .map(([name, value], i) => ({
      name,
      value: Math.round(value * 100) / 100,
      color: CHART_COLORS[i % CHART_COLORS.length]!,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildMonthlyTrend(transactions: Transaction[]): CashFlowPoint[] {
  const grouped = new Map<string, { income: number; expense: number }>();

  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    const key = d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
    const entry = grouped.get(key) ?? { income: 0, expense: 0 };
    if (tx.type === "income") {
      entry.income += tx.amount;
    } else {
      entry.expense += tx.amount;
    }
    grouped.set(key, entry);
  });

  return Array.from(grouped.entries()).map(([label, data]) => ({
    label,
    income: Math.round(data.income * 100) / 100,
    expense: Math.round(data.expense * 100) / 100,
  }));
}

function SummaryCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="h-4 w-20 rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-28 rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-5 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full rounded bg-muted/50" />
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const dateRange = useMemo(() => {
    if (period === "custom" && customStart && customEnd) {
      return {
        startDate: new Date(customStart).toISOString(),
        endDate: new Date(customEnd).toISOString(),
      };
    }
    return getDateRange(period);
  }, [period, customStart, customEnd]);

  const { data: txData, isLoading: txLoading } = useGetTransactionsQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    limit: 100,
    sortBy: "date",
    sortOrder: "asc",
  });

  const { data: summaryData, isLoading: summaryLoading } =
    useGetTransactionSummaryQuery({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });

  const transactions = txData?.data ?? [];
  const summary = summaryData?.data;

  const cashFlowData = useMemo(
    () => buildCashFlowData(transactions, period),
    [transactions, period]
  );

  const categoryData = useMemo(
    () => buildCategoryBreakdown(transactions),
    [transactions]
  );

  const monthlyTrend = useMemo(
    () => buildMonthlyTrend(transactions),
    [transactions]
  );

  const topCategories = useMemo(
    () => categoryData.slice(0, 8),
    [categoryData]
  );

  const handleExport = (format: "csv" | "pdf") => {
    toast({
      title: `Export as ${format.toUpperCase()}`,
      description: "Export functionality will be available soon.",
    });
  };

  const isLoading = txLoading || summaryLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-muted-foreground">
            Analyze your financial data and trends
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport("csv")}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => handleExport("pdf")}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              {(
                [
                  { value: "week", label: "This Week" },
                  { value: "month", label: "This Month" },
                  { value: "year", label: "This Year" },
                  { value: "custom", label: "Custom" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    period === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {period === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SummaryCardSkeleton key={i} />
          ))}
        </div>
      ) : summary ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(summary.totalIncome)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Expenses
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net
              </CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p
                className={`text-xl font-bold ${
                  summary.netBalance >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(summary.netBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transactions
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{transactions.length}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Charts */}
      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cash Flow Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Cash Flow</CardTitle>
              </div>
              <CardDescription>Income vs expenses over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={cashFlowData}>
                  <defs>
                    <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--popover-foreground))",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#incomeGradient)"
                    name="Income"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#expenseGradient)"
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" />
                <CardTitle>Category Breakdown</CardTitle>
              </div>
              <CardDescription>Spending distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  No expense data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {categoryData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Monthly Trend</CardTitle>
              </div>
              <CardDescription>Monthly income vs expenses comparison</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyTrend.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="label"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Spending Categories */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <CardTitle>Top Spending Categories</CardTitle>
              </div>
              <CardDescription>Highest expense categories ranked</CardDescription>
            </CardHeader>
            <CardContent>
              {topCategories.length === 0 ? (
                <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                  No expense data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(250, topCategories.length * 45)}>
                  <BarChart data={topCategories} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      className="text-xs"
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--popover-foreground))",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="value" name="Spent" radius={[0, 4, 4, 0]}>
                      {topCategories.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
