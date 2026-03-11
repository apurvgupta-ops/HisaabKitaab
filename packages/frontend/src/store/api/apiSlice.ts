import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { clearCredentials } from '../slices/authSlice';

interface AuthSliceState {
  token: string | null;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '',
  prepareHeaders: (headers, { getState }) => {
    const { token } = (getState() as { auth: AuthSliceState }).auth;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * Wraps fetchBaseQuery to:
 * 1. Unwrap the backend's `{ success, data, error }` envelope
 * 2. Auto-redirect to /login on 401 Unauthorized
 */
const baseQueryWithUnwrap: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error) {
    if (result.error.status === 401) {
      api.dispatch(clearCredentials());
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    const errData = result.error.data as { error?: { message?: string } } | undefined;
    return {
      error: {
        status: result.error.status,
        data: errData?.error ?? result.error.data,
      } as FetchBaseQueryError,
    };
  }

  const body = result.data as Record<string, unknown> | undefined;
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    const { success: _s, ...rest } = body;
    if (Object.keys(rest).length === 1) {
      return { data: rest.data };
    }
    const { data: innerData, ...extra } = rest;
    return { data: { data: innerData, ...extra } };
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithUnwrap,
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
