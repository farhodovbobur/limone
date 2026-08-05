import { api } from '../../../shared/api/axios';
import type { AuthUser } from '../store/authStore';
import type { LoginInput } from '../schemas/login.schema';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  sessionIdleMs: number;
  user: AuthUser;
}

export const authApi = {
  login: (input: LoginInput) =>
    api.post<LoginResponse>('/auth/login', input).then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post<void>('/auth/logout', { refreshToken }).then(() => undefined),

  me: () => api.get<AuthUser>('/auth/me').then((r) => r.data),

  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    api.post<void>('/auth/change-password', input).then(() => undefined),
};
