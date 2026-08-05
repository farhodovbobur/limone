import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import {
  sessionIdleLimit,
  useAuthStore,
} from '../../features/auth/store/authStore';
import { isIdleExpired } from '../session/activity';
import { endSession } from '../session/endSession';

export const api = axios.create({ baseURL: env.apiBaseUrl });

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) {
      return Promise.reject(new Error('No refresh token'));
    }
    refreshPromise = axios
      .post<{
        accessToken: string;
        refreshToken: string;
        sessionIdleMs: number;
      }>(`${env.apiBaseUrl}/auth/refresh`, { refreshToken })
      .then(({ data }) => {
        useAuthStore
          .getState()
          .setTokens(data.accessToken, data.refreshToken, data.sessionIdleMs);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const url = original?.url ?? '';
    const isAuthCall =
      url.includes('/auth/login') || url.includes('/auth/refresh');

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      isAuthCall
    ) {
      throw error;
    }

    if (isIdleExpired(sessionIdleLimit())) {
      void endSession('idle');
      throw error;
    }

    original._retry = true;
    try {
      const token = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      void endSession('expired');
      throw error;
    }
  },
);
