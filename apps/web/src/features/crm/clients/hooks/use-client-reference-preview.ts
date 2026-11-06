'use client';

import { useCallback } from 'react';
import { previewClientReference } from '../api/clients.api';
import { clientKeys } from './client.keys';
import { useClientAsyncResource } from './use-client-async-resource';
import type { ClientReferencePreviewResponse } from '../types/client.types';

export function useClientReferencePreview(enabled: boolean) {
  const cacheKey = JSON.stringify(clientKeys.referencePreview());
  const loader = useCallback(() => previewClientReference(), []);
  const { data, loading, error, refetch } = useClientAsyncResource<ClientReferencePreviewResponse>(
    cacheKey,
    enabled,
    loader,
  );
  return { preview: data, loading, error, refetch };
}
