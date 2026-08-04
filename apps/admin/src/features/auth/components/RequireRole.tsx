import type { ReactNode } from 'react';
import { AccessDenied } from '../../../shared/components/AccessDenied';
import { useAuthStore } from '../store/authStore';

export function RequireRole({
  roles,
  children,
}: {
  roles: readonly string[];
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!user || !roles.includes(user.role)) {
    return <AccessDenied />;
  }
  return children;
}
