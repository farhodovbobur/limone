import { describe, expect, it } from 'vitest';
import { safeInternalPath } from './safePath';

describe('safeInternalPath', () => {
  it('passes ordinary in-app paths through', () => {
    expect(safeInternalPath('/staff')).toBe('/staff');
    expect(safeInternalPath('/staff?page=2')).toBe('/staff?page=2');
    expect(safeInternalPath('/')).toBe('/');
  });

  it('rejects external and protocol-relative targets', () => {
    expect(safeInternalPath('https://evil.com')).toBe('/');
    expect(safeInternalPath('//evil.com')).toBe('/');
  });

  it('rejects backslash smuggling (GHSA-wrjc-x8rr-h8h6 vector)', () => {
    expect(safeInternalPath('/\\evil.com')).toBe('/');
    expect(safeInternalPath('/\\/evil.com')).toBe('/');
    expect(safeInternalPath('/staff\\..')).toBe('/');
  });

  it('falls back on empty or missing values', () => {
    expect(safeInternalPath(undefined)).toBe('/');
    expect(safeInternalPath('')).toBe('/');
    expect(safeInternalPath('staff')).toBe('/');
  });
});
