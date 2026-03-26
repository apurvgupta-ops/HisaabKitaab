import { apiSlice } from './apiSlice';

export interface HouseholdSummaryResponse {
  group: {
    id: string;
    name: string;
    currency: string;
    memberCount: number;
  };
  period: {
    month: string;
    startDate: string;
    endDate: string;
  };
  totals: {
    totalExpenses: number;
    totalPaid: number;
    totalOwed: number;
    fairSharePerMember: number;
    unsettledAmount: number;
  };
  members: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    };
    paid: number;
    owed: number;
    netBalance: number;
    fairShare: number;
    contributionDelta: number;
  }>;
  categories: Array<{
    categoryId: string | null;
    categoryName: string;
    totalAmount: number;
    expenseCount: number;
    percentage: number;
  }>;
  insights: {
    mostContributingMemberId: string | null;
    leastContributingMemberId: string | null;
  };
}

export const householdApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getHouseholdSummary: builder.query<
      HouseholdSummaryResponse,
      { groupId: string; month?: string }
    >({
      query: ({ groupId, month }) => ({
        url: `household/${groupId}/summary`,
        params: month ? { month } : undefined,
      }),
      providesTags: (_result, _error, { groupId }) => [{ type: 'Household', id: groupId }],
    }),
  }),
});

export const { useGetHouseholdSummaryQuery } = householdApi;
