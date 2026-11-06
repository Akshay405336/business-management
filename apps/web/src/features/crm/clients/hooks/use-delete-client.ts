'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { deleteClient } from '../api/clients.api';

export function useDeleteClient() {
  const { pending, run } = useAsyncAction();
  const mutate = useCallback(async (id: string): Promise<void> => run(() => deleteClient(id)), [run]);
  return { deleteClient: mutate, pending };
}
