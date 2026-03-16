import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { Mutex } from 'async-mutex';
import { clearCredentials, setCredentials, type UserData } from '../slices/authSlice';

interface AuthSliceState {
  token: string | null;
  refreshToken: string | null;
  user: UserData | null;
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

const refreshMutex = new Mutex();

/**
 * Wraps fetchBaseQuery to:
 * 1. Unwrap the backend's `{ success, data, error }` envelope
 * 2. On 401, attempt a token refresh before giving up
 * 3. Uses a mutex to prevent concurrent refresh attempts
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  await refreshMutex.waitForUnlock();

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (!refreshMutex.isLocked()) {
      const release = await refreshMutex.acquire();
      try {
        const { refreshToken, user } = (api.getState() as { auth: AuthSliceState }).auth;

        if (refreshToken) {
          const refreshResult = await rawBaseQuery(
            {
              url: '/api/auth/refresh',
              method: 'POST',
              body: { refreshToken },
            },
            api,
            extraOptions,
          );

          const refreshBody = refreshResult.data as
            | { success: boolean; data: { accessToken: string; refreshToken: string } }
            | undefined;

          if (refreshBody?.success && refreshBody.data) {
            api.dispatch(
              setCredentials({
                user: user!,
                accessToken: refreshBody.data.accessToken,
                refreshToken: refreshBody.data.refreshToken,
              }),
            );
            result = await rawBaseQuery(args, api, extraOptions);
          } else {
            api.dispatch(clearCredentials());
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
          }
        } else {
          api.dispatch(clearCredentials());
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } finally {
        release();
      }
    } else {
      await refreshMutex.waitForUnlock();
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  if (result.error) {
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
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Group',
    'Expense',
    'Settlement',
    'Transaction',
    'Budget',
    'Category',
    'FeatureFlags',
  ],
  endpoints: () => ({}),
});
