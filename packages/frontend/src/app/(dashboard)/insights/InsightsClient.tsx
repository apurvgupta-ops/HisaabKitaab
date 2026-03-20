'use client';

import {
  Brain,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  PieChart as PieChartIcon,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { useGetInsightsQuery } from '@/store/api/aiApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const CHART_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
  '#84cc16',
];

export default function InsightsClient() {
  const { data: insights, isLoading, isError, refetch } = useGetInsightsQuery();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-muted-foreground mt-3 text-sm">Generating AI insights...</p>
      </div>
    );
  }

  if (isError || !insights) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground mt-1">AI-powered analysis of your financial data.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-10 w-10 text-amber-500" />
            <p className="mt-3 font-medium">Unable to load insights</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Make sure you have transactions and the AI service is configured.
            </p>
            <Button onClick={() => refetch()} variant="outline" className="mt-4 gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const maxCategoryTotal = Math.max(...insights.topCategories.map((c) => c.total), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Insights</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered analysis of your spending patterns and trends.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Spending Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Spending Trends
          </CardTitle>
          <CardDescription>How your spending has changed over time.</CardDescription>
        </CardHeader>
        <CardContent>
          {insights.spendingTrends.length > 0 ? (
            <div className="space-y-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.spendingTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="period" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid hsl(var(--border))',
                        backgroundColor: 'hsl(var(--background))',
                      }}
                    />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {insights.spendingTrends.map((trend) => (
                  <div
                    key={trend.period}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{trend.period}</p>
                      <p className="text-muted-foreground text-xs">${trend.amount.toFixed(2)}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        trend.change > 0
                          ? 'border-red-200 bg-red-50 text-red-600'
                          : trend.change < 0
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                            : 'border-gray-200 bg-gray-50 text-gray-600'
                      }
                    >
                      {trend.change > 0 ? (
                        <TrendingUp className="mr-1 h-3 w-3" />
                      ) : trend.change < 0 ? (
                        <TrendingDown className="mr-1 h-3 w-3" />
                      ) : null}
                      {trend.change > 0 ? '+' : ''}
                      {trend.change.toFixed(1)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No spending trend data available yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-violet-500" />
              Top Categories
            </CardTitle>
            <CardDescription>Where your money goes.</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.topCategories.length > 0 ? (
              <div className="space-y-6">
                <div className="mx-auto h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={insights.topCategories}
                        dataKey="percentage"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {insights.topCategories.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {insights.topCategories.map((cat, i) => (
                    <div key={cat.categoryId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          />
                          <span className="font-medium">{cat.categoryName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">${cat.total.toFixed(2)}</span>
                          <Badge variant="secondary" className="text-xs">
                            {cat.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={(cat.total / maxCategoryTotal) * 100} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No category data available yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* AI Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-amber-500" />
              AI Suggestions
            </CardTitle>
            <CardDescription>Personalized tips to improve your finances.</CardDescription>
          </CardHeader>
          <CardContent>
            {insights.suggestions.length > 0 ? (
              <div className="space-y-3">
                {insights.suggestions.map((suggestion, i) => (
                  <div key={i} className="flex gap-3 rounded-lg border p-4">
                    <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <p className="text-sm leading-relaxed">{suggestion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No suggestions available yet. Add more transactions to get personalized tips.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
