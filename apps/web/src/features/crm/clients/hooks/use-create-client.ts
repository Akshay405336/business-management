'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { createClient } from '../api/clients.api';
import type { CreateClientRequest, CrmClient } from '../types/client.types';

export function useCreateClient() {
  const { pending, run } = useAsyncAction();

  const mutate = useCallback(
    async (body: CreateClientRequest): Promise<CrmClient | undefined> =>
      run(() => createClient(body)),
    [run],
  );

  return { createClient: mutate, pending };
}
