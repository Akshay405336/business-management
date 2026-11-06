'use client';

import { useCallback } from 'react';
import { getLead } from '../api/lead.api';
import { leadKeys } from './lead.keys';
import { useLeadAsyncResource } from './use-lead-async-resource';

export function useLead(leadId: string | null, enabled = true) {
  const isEnabled = enabled && Boolean(leadId);
  const cacheKey = leadId ? JSON.stringify(leadKeys.detail(leadId)) : 'lead:none';

  const loader = useCallback(async () => {
    if (!leadId) throw new Error('Lead id is required.');
    return getLead(leadId);
  }, [leadId]);

  const { data, loading, error, refetch } = useLeadAsyncResource(
    cacheKey,
    isEnabled,
    loader,
  );

  return { lead: data, loading, error, refetch };
}
