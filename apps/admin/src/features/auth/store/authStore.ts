import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_IDLE_LIMIT_MS } from '../../../shared/session/activity';

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
  sessionIdleMs: number;
  user: AuthUser;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  tokenIssuedAt: number | null;
  idleLimitMs: number | null;
  user: AuthUser | null;
  setSession: (session: AuthSession) => void;
  setTokens: (
    accessToken: string,
    refreshToken: string,
    sessionIdleMs: number,
  ) => void;
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
      tokenIssuedAt: null,
      idleLimitMs: null,
      user: null,
      setSession: ({ sessionIdleMs, ...session }) =>
        set({
          ...session,
          tokenIssuedAt: Date.now(),
          idleLimitMs: sessionIdleMs,
        }),
      setTokens: (accessToken, refreshToken, sessionIdleMs) =>
        set({
          accessToken,
          refreshToken,
          tokenIssuedAt: Date.now(),
          idleLimitMs: sessionIdleMs,
        }),
      setUser: (user) => set({ user }),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          tokenIssuedAt: null,
          idleLimitMs: null,
          user: null,
        }),
    }),
    { name: 'limone-auth' },
  ),
);

window.addEventListener('storage', (event) => {
  if (event.key === 'limone-auth') {
    void useAuthStore.persist.rehydrate();
  }
});

export const sessionIdleLimit = (): number =>
  useAuthStore.getState().idleLimitMs ?? DEFAULT_IDLE_LIMIT_MS;
