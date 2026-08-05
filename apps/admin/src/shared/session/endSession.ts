import axios from 'axios';
import { env } from '../../config/env';
import { useAuthStore } from '../../features/auth/store/authStore';
import { clearActivity } from './activity';

/** Drives the message shown on the login screen. */
export type EndReason = 'expired' | 'idle';

export async function endSession(reason: EndReason): Promise<void> {
  const { refreshToken } = useAuthStore.getState();

  if (refreshToken) {
    await axios
      .post(`${env.apiBaseUrl}/auth/logout`, { refreshToken })
      .catch(() => undefined);
  }

  useAuthStore.getState().clearSession();
  clearActivity();
  window.location.assign(`/login?reason=${reason}`);
}
