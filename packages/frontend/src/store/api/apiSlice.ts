import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

interface AuthSliceState {
  token: string | null;
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '',
    prepareHeaders: (headers, { getState }) => {
      const { token } = (getState() as { auth: AuthSliceState }).auth;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: [
    'User',
    'Group',
    'Expense',
    'Settlement',
    'Transaction',
    'Budget',
    'Category',
  ],
  endpoints: () => ({}),
});
