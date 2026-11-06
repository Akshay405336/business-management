'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { updateClient } from '../api/clients.api';
import type { CrmClient, UpdateClientRequest } from '../types/client.types';

export function useUpdateClient() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (id: string, body: UpdateClientRequest): Promise<CrmClient | undefined> =>
      run(() => updateClient(id, body)),
    [run],
  );

  return { updateClient: mutate, pending };
}
