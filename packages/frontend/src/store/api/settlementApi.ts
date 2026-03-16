import type {
  SettlementWithUsers,
  DebtEdge,
  SettlementStatus,
  PaymentMethod,
} from '@splitwise/shared';
import { apiSlice } from './apiSlice';

interface CreateSettlementRequest {
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  note?: string;
}

interface UpdateSettlementStatusRequest {
  id: string;
  status: SettlementStatus;
}

export const settlementApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGroupSettlements: builder.query<SettlementWithUsers[], string>({
      query: (groupId) => `settlements/group/${groupId}`,
      providesTags: ['Settlement'],
    }),

    getSimplifiedDebts: builder.query<DebtEdge[], string>({
      query: (groupId) => `settlements/group/${groupId}/simplified`,
      providesTags: ['Settlement'],
    }),

    getUserSettlements: builder.query<SettlementWithUsers[], void>({
      query: () => 'settlements/me',
      providesTags: ['Settlement'],
    }),

    createSettlement: builder.mutation<SettlementWithUsers, CreateSettlementRequest>({
      query: (body) => ({
        url: 'settlements',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Settlement', 'Expense'],
    }),

    updateSettlementStatus: builder.mutation<SettlementWithUsers, UpdateSettlementStatusRequest>({
      query: ({ id, ...body }) => ({
        url: `settlements/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Settlement'],
    }),
  }),
});

export const {
  useGetGroupSettlementsQuery,
  useGetSimplifiedDebtsQuery,
  useGetUserSettlementsQuery,
  useCreateSettlementMutation,
  useUpdateSettlementStatusMutation,
} = settlementApi;
