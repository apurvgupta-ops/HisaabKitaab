import type {
  Transaction,
  TransactionFilters,
  TransactionSummary,
  PaginationMeta,
} from '@splitwise/shared';
import { apiSlice } from './apiSlice';

interface CreateTransactionRequest {
  type: 'income' | 'expense';
  amount: number;
  currency?: string;
  description: string;
  categoryId?: string;
  account: string;
  date?: string;
  metadata?: Record<string, unknown>;
}

interface UpdateTransactionRequest extends Partial<CreateTransactionRequest> {
  id: string;
}

export const transactionApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTransactions: builder.query<
      { data: Transaction[]; pagination: PaginationMeta },
      TransactionFilters | void
    >({
      query: (params) => ({
        url: '/api/transactions',
        params: params ?? undefined,
      }),
      providesTags: ['Transaction'],
    }),

    getTransaction: builder.query<Transaction, string>({
      query: (id) => `/api/transactions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Transaction', id }],
    }),

    getTransactionSummary: builder.query<
      TransactionSummary,
      { startDate?: string; endDate?: string } | void
    >({
      query: (params) => ({
        url: '/api/transactions/summary',
        params: params ?? undefined,
      }),
      providesTags: ['Transaction'],
    }),

    createTransaction: builder.mutation<
      Transaction,
      CreateTransactionRequest
    >({
      query: (body) => ({
        url: '/api/transactions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Transaction', 'Budget'],
    }),

    updateTransaction: builder.mutation<
      Transaction,
      UpdateTransactionRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/api/transactions/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Transaction', 'Budget'],
    }),

    deleteTransaction: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/transactions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Transaction', 'Budget'],
    }),
  }),
});

export const {
  useGetTransactionsQuery,
  useGetTransactionQuery,
  useGetTransactionSummaryQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} = transactionApi;
