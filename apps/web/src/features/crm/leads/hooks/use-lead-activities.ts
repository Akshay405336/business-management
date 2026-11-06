'use client';

import { useCallback } from 'react';
import { listLeadActivities } from '../api/lead.api';
import { leadKeys } from './lead.keys';
import { useLeadAsyncResource } from './use-lead-async-resource';

export function useLeadActivities(leadId: string | null, enabled = true) {
  const isEnabled = enabled && Boolean(leadId);
  const cacheKey = leadId ? JSON.stringify(leadKeys.activities(leadId)) : 'lead-activities:none';

  const loader = useCallback(async () => {
    if (!leadId) throw new Error('Lead id is required.');
    const result = await listLeadActivities(leadId);
    return result.activities;
  }, [leadId]);

  const { data, loading, error, refetch } = useLeadAsyncResource(
    cacheKey,
    isEnabled,
    loader,
  );

  return { activities: data ?? [], loading, error, refetch };
}
