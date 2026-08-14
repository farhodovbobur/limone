export const APP = process.env.SHOT_APP ?? 'http://localhost:4200';
export const API = process.env.SHOT_API ?? 'http://localhost:3000/api';

/** Below this the shell is a drawer and tables become stacked lists. */
export const DRAWER_MAX = 1023;
export const TABLE_MIN = 768;

export function requireCredentials(script) {
  const { SHOT_USER, SHOT_PASS } = process.env;
  if (!SHOT_USER || !SHOT_PASS) {
    console.error(
      `Set SHOT_USER and SHOT_PASS.\n` +
        `  SHOT_USER=<username> SHOT_PASS=<password> npm run ${script}`,
    );
    process.exit(1);
  }
  return { SHOT_USER, SHOT_PASS };
}

export async function signIn(script) {
  const { SHOT_USER, SHOT_PASS } = requireCredentials(script);
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: SHOT_USER, password: SHOT_PASS }),
  });
  if (!res.ok) {
    throw new Error(`login failed: ${res.status} ${await res.text()}`);
  }
  const { sessionIdleMs, ...session } = await res.json();
  // Same shape the zustand persist middleware writes.
  return {
    state: {
      ...session,
      tokenIssuedAt: Date.now(),
      idleLimitMs: sessionIdleMs,
    },
    version: 0,
  };
}

export async function seedSession(context, auth) {
  await context.addInitScript(
    ([session, sidebar]) => {
      localStorage.setItem('limone-auth', session);
      localStorage.setItem('limone-sidebar', sidebar);
    },
    [
      JSON.stringify(auth),
      JSON.stringify({ state: { railPreference: false }, version: 0 }),
    ],
  );
}
