export function accessTokenLifetime(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const { exp, iat } = JSON.parse(new TextDecoder().decode(bytes)) as {
      exp?: number;
      iat?: number;
    };

    if (typeof exp !== 'number' || typeof iat !== 'number') return null;
    return (exp - iat) * 1000;
  } catch {
    return null;
  }
}
