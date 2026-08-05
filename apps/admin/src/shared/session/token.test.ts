import { describe, expect, it } from 'vitest';
import { accessTokenLifetime } from './token';

// Builds the base64url payload segment the way a JWT actually carries it:
// '+' and '/' swapped out, padding stripped.
function tokenWith(payload: unknown): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  const binary = String.fromCharCode(...bytes);
  const b64 = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${b64}.signature`;
}

describe('accessTokenLifetime', () => {
  it('returns the server-stated lifetime in milliseconds', () => {
    const iat = 1_800_000_000;
    expect(
      accessTokenLifetime(tokenWith({ sub: 1, iat, exp: iat + 900 })),
    ).toBe(900_000);
  });

  it('ignores the local clock entirely', () => {
    // The whole point: a browser hours out of step with the API must still
    // read a 15-minute token as 15 minutes. Both claims come from one clock,
    // so their difference cannot be distorted by ours.
    const iat = Math.floor(Date.now() / 1000) - 60 * 60 * 6;
    expect(accessTokenLifetime(tokenWith({ iat, exp: iat + 900 }))).toBe(
      900_000,
    );
  });

  it('survives a non-ASCII payload', () => {
    // atob alone would mangle these bytes; the decoder path must handle them.
    const iat = 1_800_000_000;
    const token = tokenWith({
      username: "Дилноза O'ktamova — 好",
      iat,
      exp: iat + 900,
    });
    expect(accessTokenLifetime(token)).toBe(900_000);
  });

  it('handles every base64url padding length', () => {
    for (const pad of ['a', 'ab', 'abc', 'abcd']) {
      const iat = 1_700_000_000;
      expect(accessTokenLifetime(tokenWith({ pad, iat, exp: iat + 60 }))).toBe(
        60_000,
      );
    }
  });

  it('returns null when either claim is missing', () => {
    expect(accessTokenLifetime(tokenWith({ sub: 1 }))).toBeNull();
    expect(accessTokenLifetime(tokenWith({ exp: 1_800_000_900 }))).toBeNull();
    expect(accessTokenLifetime(tokenWith({ iat: 1_800_000_000 }))).toBeNull();
  });

  it('returns null for a malformed token instead of throwing', () => {
    expect(accessTokenLifetime('not-a-jwt')).toBeNull();
    expect(accessTokenLifetime('')).toBeNull();
    expect(accessTokenLifetime('header..signature')).toBeNull();
    expect(accessTokenLifetime('header.%%%.signature')).toBeNull();
  });
});
