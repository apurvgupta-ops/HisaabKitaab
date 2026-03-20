import { apiSlice } from './apiSlice';

export interface PendingDebt {
  settlementId: string;
  groupId: string;
  groupName: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
  createdAt: string;
  daysPending: number;
}

interface NudgeResponse {
  sent: boolean;
  message: string;
}

export const reminderApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPendingDebts: builder.query<PendingDebt[], void>({
      query: () => 'reminders/pending',
      providesTags: ['Settlement'],
    }),

    sendNudge: builder.mutation<NudgeResponse, string>({
      query: (settlementId) => ({
        url: `reminders/nudge/${settlementId}`,
        method: 'POST',
      }),
    }),
  }),
});

export const { useGetPendingDebtsQuery, useSendNudgeMutation } = reminderApi;
