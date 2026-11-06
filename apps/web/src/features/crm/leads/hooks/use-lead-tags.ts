'use client';

import { useCallback } from 'react';
import { listLeadTags } from '../api/lead-tag.api';
import { leadKeys } from './lead.keys';
import { useLeadAsyncResource } from './use-lead-async-resource';

export function useLeadTags(search?: string, enabled = true) {
  const cacheKey = JSON.stringify(leadKeys.tags(search));
  const loader = useCallback(async () => {
    const result = await listLeadTags(search);
    return result.items;
  }, [search]);

  const { data, loading, error, refetch } = useLeadAsyncResource(cacheKey, enabled, loader);

  return { tags: data ?? [], loading, error, refetch };
}
