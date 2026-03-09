import type { ApiResponse } from '@splitwise/shared';
import { apiSlice } from './apiSlice';

interface CategorizeRequest {
  description: string;
  amount?: number;
}

interface CategorizeResponse {
  categoryId: string;
  categoryName: string;
  confidence: number;
}

interface ParseExpenseRequest {
  text: string;
}

interface ParseExpenseResponse {
  description: string;
  amount: number;
  currency: string;
  categoryId: string | null;
  date: string | null;
  participants: string[];
}

interface InsightsResponse {
  spendingTrends: {
    period: string;
    amount: number;
    change: number;
  }[];
  topCategories: {
    categoryId: string;
    categoryName: string;
    total: number;
    percentage: number;
  }[];
  suggestions: string[];
}

export const aiApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    categorizeExpense: builder.mutation<
      ApiResponse<CategorizeResponse>,
      CategorizeRequest
    >({
      query: (body) => ({
        url: '/api/ai/categorize',
        method: 'POST',
        body,
      }),
    }),

    parseExpense: builder.mutation<
      ApiResponse<ParseExpenseResponse>,
      ParseExpenseRequest
    >({
      query: (body) => ({
        url: '/api/ai/parse',
        method: 'POST',
        body,
      }),
    }),

    getInsights: builder.query<ApiResponse<InsightsResponse>, void>({
      query: () => '/api/ai/insights',
    }),
  }),
});

export const {
  useCategorizeExpenseMutation,
  useParseExpenseMutation,
  useGetInsightsQuery,
} = aiApi;
