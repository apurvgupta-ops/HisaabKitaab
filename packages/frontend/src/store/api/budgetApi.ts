import type {
  BudgetWithProgress,
  BudgetAlert,
  BudgetPeriod,
} from '@splitwise/shared';
import { apiSlice } from './apiSlice';

interface CreateBudgetRequest {
  categoryId?: string;
  limitAmount: number;
  period: BudgetPeriod;
  alertThreshold?: number;
  startDate: string;
  endDate?: string;
}

interface UpdateBudgetRequest extends Partial<CreateBudgetRequest> {
  id: string;
}

export const budgetApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBudgets: builder.query<BudgetWithProgress[], void>({
      query: () => '/api/budgets',
      providesTags: ['Budget'],
    }),

    getBudget: builder.query<BudgetWithProgress, string>({
      query: (id) => `/api/budgets/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Budget', id }],
    }),

    getBudgetAlerts: builder.query<BudgetAlert[], void>({
      query: () => '/api/budgets/alerts',
      providesTags: ['Budget'],
    }),

    createBudget: builder.mutation<
      BudgetWithProgress,
      CreateBudgetRequest
    >({
      query: (body) => ({
        url: '/api/budgets',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Budget'],
    }),

    updateBudget: builder.mutation<
      BudgetWithProgress,
      UpdateBudgetRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/api/budgets/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Budget', id }],
    }),

    deleteBudget: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/budgets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Budget'],
    }),
  }),
});

export const {
  useGetBudgetsQuery,
  useGetBudgetQuery,
  useGetBudgetAlertsQuery,
  useCreateBudgetMutation,
  useUpdateBudgetMutation,
  useDeleteBudgetMutation,
} = budgetApi;
