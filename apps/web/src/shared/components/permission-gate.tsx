'use client';

import type { PermissionKey } from '@techwin/contracts';
import type { ReactNode } from 'react';
import { usePermissions } from '@/features/auth/components/permissions-provider';

export function PermissionGate({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}: {
  permission?: PermissionKey;
  anyOf?: readonly PermissionKey[];
  allOf?: readonly PermissionKey[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { has, hasAny, hasAll } = usePermissions();

  let allowed = true;
  if (permission) allowed = has(permission);
  else if (anyOf && anyOf.length > 0) allowed = hasAny(...anyOf);
  else if (allOf && allOf.length > 0) allowed = hasAll(...allOf);

  if (!allowed) return fallback;
  return children;
}
