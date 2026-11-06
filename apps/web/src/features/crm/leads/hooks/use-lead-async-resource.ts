'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { describeCrmError } from '../utils/errors';

export type LeadAsyncSnapshot<T> = {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
};

const idleSnapshot = <T,>(): LeadAsyncSnapshot<T> => ({
  data: null,
  loading: false,
  error: null,
});

class LeadAsyncResource<T> {
  private snapshot: LeadAsyncSnapshot<T> = idleSnapshot();
  private listeners = new Set<() => void>();
  private generation = 0;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): LeadAsyncSnapshot<T> => this.snapshot;

  getServerSnapshot = (): LeadAsyncSnapshot<T> => idleSnapshot();

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  reset(): void {
    this.generation += 1;
    this.snapshot = idleSnapshot();
    this.notify();
  }

  run(loader: () => Promise<T>): void {
    const generation = (this.generation += 1);
    this.snapshot = { ...this.snapshot, loading: true, error: null };
    this.notify();
    void loader()
      .then((data) => {
        if (generation !== this.generation) return;
        this.snapshot = { data, loading: false, error: null };
        this.notify();
      })
      .catch((failure: unknown) => {
        if (generation !== this.generation) return;
        this.snapshot = {
          data: this.snapshot.data,
          loading: false,
          error: describeCrmError(failure),
        };
        this.notify();
      });
  }
}

const resourceCache = new Map<string, LeadAsyncResource<unknown>>();

function getLeadAsyncResource<T>(cacheKey: string): LeadAsyncResource<T> {
  const existing = resourceCache.get(cacheKey) as LeadAsyncResource<T> | undefined;
  if (existing) return existing;
  const created = new LeadAsyncResource<T>();
  resourceCache.set(cacheKey, created);
  return created;
}

export function useLeadAsyncResource<T>(
  cacheKey: string,
  enabled: boolean,
  loader: () => Promise<T>,
): LeadAsyncSnapshot<T> & { readonly refetch: () => void } {
  const resource = getLeadAsyncResource<T>(cacheKey);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubscribe = resource.subscribe(onStoreChange);
      if (enabled) {
        resource.run(loader);
      } else {
        resource.reset();
      }
      return unsubscribe;
    },
    [enabled, loader, resource],
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    resource.getSnapshot,
    resource.getServerSnapshot,
  );

  const refetch = useCallback(() => {
    if (!enabled) return;
    resource.run(loader);
  }, [enabled, loader, resource]);

  return { ...snapshot, refetch };
}
