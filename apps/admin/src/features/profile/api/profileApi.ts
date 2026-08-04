import { api } from '../../../shared/api/axios';
import type { AuthUser } from '../../auth/store/authStore';

export interface ProfileUser extends AuthUser {
  phone: string | null;
  email: string | null;
  createdAt: string;
}

export interface SessionInfo {
  id: number;
  userAgent: string | null;
  ip: string | null;
  browser: string | null;
  os: string | null;
  deviceType: 'desktop' | 'mobile' | null;
  location: string | null;
  createdAt: string;
  current: boolean;
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
}

export const profileApi = {
  me: () => api.get<ProfileUser>('/auth/me').then((r) => r.data),

  update: (input: UpdateProfileInput) =>
    api.patch<ProfileUser>('/auth/me', input).then((r) => r.data),

  sessions: () => api.get<SessionInfo[]>('/auth/sessions').then((r) => r.data),

  revokeSession: (id: number) =>
    api.delete<void>(`/auth/sessions/${id}`).then(() => undefined),

  revokeOthers: () =>
    api.post<void>('/auth/sessions/revoke-others').then(() => undefined),
};
