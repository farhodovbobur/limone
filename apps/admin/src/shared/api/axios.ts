import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import { useAuthStore } from '../../features/auth/store/authStore';

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

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) {
      return Promise.reject(new Error('No refresh token'));
    }
    refreshPromise = axios
      .post<{ accessToken: string; refreshToken: string }>(
        `${env.apiBaseUrl}/auth/refresh`,
        { refreshToken },
      )
      .then(({ data }) => {
        useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
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

    original._retry = true;
    try {
      const token = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      useAuthStore.getState().clearSession();
      window.location.assign('/login');
      throw error;
    }
  },
);
