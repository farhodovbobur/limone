import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './safePath';

describe('safeInternalPath', () => {
  it('passes ordinary in-app paths through', () => {
    expect(safeInternalPath('/users')).toBe('/users');
    expect(safeInternalPath('/users?page=2')).toBe('/users?page=2');
    expect(safeInternalPath('/')).toBe('/');
  });

  it('rejects external and protocol-relative targets', () => {
    expect(safeInternalPath('https://evil.com')).toBe('/');
    expect(safeInternalPath('//evil.com')).toBe('/');
  });

  it('rejects backslash smuggling (GHSA-wrjc-x8rr-h8h6 vector)', () => {
    expect(safeInternalPath('/\\evil.com')).toBe('/');
    expect(safeInternalPath('/\\/evil.com')).toBe('/');
    expect(safeInternalPath('/users\\..')).toBe('/');
  });

  it('falls back on empty or missing values', () => {
    expect(safeInternalPath(undefined)).toBe('/');
    expect(safeInternalPath('')).toBe('/');
    expect(safeInternalPath('users')).toBe('/');
  });
});
