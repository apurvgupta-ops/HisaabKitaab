import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  AuthTokens,
} from '@splitwise/shared';
import { apiSlice } from './apiSlice';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/api/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),

    refreshToken: builder.mutation<AuthTokens, RefreshTokenRequest>({
      query: (body) => ({
        url: '/api/auth/refresh',
        method: 'POST',
        body,
      }),
    }),

    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/api/auth/logout',
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
} = authApi;
