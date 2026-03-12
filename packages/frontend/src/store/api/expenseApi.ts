import type {
  ExpenseWithDetails,
  ExpenseFilters,
  PaginationMeta,
} from '@splitwise/shared';
import { apiSlice } from './apiSlice';

export interface BalanceEntry {
  user: { id: string; name: string; email: string; avatar: string | null };
  paid: number;
  owed: number;
  balance: number;
}

interface CreateExpenseRequest {
  groupId: string;
  amount: number;
  currency?: string;
  description: string;
  splitType: string;
  categoryId?: string;
  tags?: string[];
  date?: string;
  payers: { userId: string; amount: number }[];
  splits: {
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }[];
}

interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {
  id: string;
}

export const expenseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGroupExpenses: builder.query<
      { data: ExpenseWithDetails[]; pagination: PaginationMeta },
      { groupId: string } & ExpenseFilters
    >({
      query: ({ groupId, ...params }) => ({
        url: `/api/expenses/group/${groupId}`,
        params,
      }),
      providesTags: ['Expense'],
    }),

    getExpense: builder.query<ExpenseWithDetails, string>({
      query: (id) => `/api/expenses/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Expense', id }],
    }),

    createExpense: builder.mutation<
      ExpenseWithDetails,
      CreateExpenseRequest
    >({
      query: (body) => ({
        url: '/api/expenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Expense', 'Settlement'],
    }),

    updateExpense: builder.mutation<
      ExpenseWithDetails,
      UpdateExpenseRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/api/expenses/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Expense', 'Settlement'],
    }),

    deleteExpense: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/expenses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Expense', 'Settlement'],
    }),

    getGroupBalances: builder.query<BalanceEntry[], string>({
      query: (groupId) => `/api/expenses/group/${groupId}/balances`,
      providesTags: (_result, _error, groupId) => [
        { type: 'Expense', id: `balances-${groupId}` },
        'Settlement',
      ],
    }),
  }),
});

export const {
  useGetGroupExpensesQuery,
  useGetExpenseQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetGroupBalancesQuery,
} = expenseApi;
