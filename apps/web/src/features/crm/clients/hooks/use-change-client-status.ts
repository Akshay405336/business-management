'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { changeClientStatus } from '../api/clients.api';
import type { ClientStatus, CrmClient } from '../types/client.types';

export function useChangeClientStatus() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string, status: ClientStatus): Promise<CrmClient | undefined> =>
      run(() => changeClientStatus(id, { status })),
    [run],
  );

  return { changeClientStatus: mutate, pending };
}
