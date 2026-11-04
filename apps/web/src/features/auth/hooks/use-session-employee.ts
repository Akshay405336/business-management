'use client';

import type { MySessionEmployeeSummary } from '@techwin/contracts';
import { usePermissions } from '@/features/auth/components/permissions-provider';

export function useSessionEmployee(): MySessionEmployeeSummary | null {
  const { sessionEmployee } = usePermissions();
  return sessionEmployee;
}
