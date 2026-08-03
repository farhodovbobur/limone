export function safeInternalPath(
  path: string | undefined,
  fallback = '/',
): string {
  return path &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\')
    ? path
    : fallback;
}
