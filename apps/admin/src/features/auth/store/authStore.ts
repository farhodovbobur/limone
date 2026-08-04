import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string | null;
  role: string;
}

interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (session: AuthSession) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  clearSession: () => void;
}

// persist → localStorage: the session survives tab/browser close
// (FRONTEND_ARCHITECTURE §5); the 2h idle rule still logs out via refresh failure.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: (session) => set(session),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken: accessToken, refreshToken: refreshToken }),
      setUser: (user) => set({ user }),
      clearSession: () =>
        set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'limone-auth' },
  ),
);
