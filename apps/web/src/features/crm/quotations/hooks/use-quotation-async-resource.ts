'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { describeCrmError } from '@/features/admin/crm/utils/errors';

export type QuotationAsyncSnapshot<T> = {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
};

const idleSnapshot = <T,>(): QuotationAsyncSnapshot<T> => ({
  data: null,
  loading: false,
  error: null,
});

class QuotationAsyncResource<T> {
  private snapshot: QuotationAsyncSnapshot<T> = idleSnapshot();
  private listeners = new Set<() => void>();
  private generation = 0;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): QuotationAsyncSnapshot<T> => this.snapshot;

  getServerSnapshot = (): QuotationAsyncSnapshot<T> => idleSnapshot();

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

const resourceCache = new Map<string, QuotationAsyncResource<unknown>>();

function getResource<T>(cacheKey: string): QuotationAsyncResource<T> {
  const existing = resourceCache.get(cacheKey) as QuotationAsyncResource<T> | undefined;
  if (existing) return existing;
  const created = new QuotationAsyncResource<T>();
  resourceCache.set(cacheKey, created);
  return created;
}

export function useQuotationAsyncResource<T>(
  cacheKey: string,
  enabled: boolean,
  loader: () => Promise<T>,
): QuotationAsyncSnapshot<T> & { readonly refetch: () => void } {
  const resource = getResource<T>(cacheKey);

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
