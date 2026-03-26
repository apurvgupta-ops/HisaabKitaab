import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileEnv } from '../config/env';

const ACCESS_TOKEN_KEY = 'mobile_access_token';

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken(): Promise<void> {
  await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
}

interface RequestOptions extends RequestInit {
  query?: Record<string, string | number | undefined>;
}

function withQuery(url: string, query?: RequestOptions['query']): string {
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, String(value));
  });
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers ?? {});

  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = withQuery(`${mobileEnv.apiBaseUrl}/${path.replace(/^\//, '')}`, options.query);

  const response = await fetch(url, { ...options, headers });
  const payload = (await response.json()) as
    | { success: true; data: T }
    | { success: false; error: { message?: string } };

  if (!response.ok || !('success' in payload) || !payload.success) {
    const message = 'error' in payload ? payload.error?.message : 'Request failed';
    throw new Error(message ?? 'Request failed');
  }

  return payload.data;
}
