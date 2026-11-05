'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { describeCrmError } from '@/features/admin/crm/utils/errors';

export type PipelineAsyncSnapshot<T> = {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
};

const idleSnapshot = <T,>(): PipelineAsyncSnapshot<T> => ({
  data: null,
  loading: false,
  error: null,
});

class PipelineAsyncResource<T> {
  private snapshot: PipelineAsyncSnapshot<T> = idleSnapshot();
  private listeners = new Set<() => void>();
  private generation = 0;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): PipelineAsyncSnapshot<T> => this.snapshot;

  getServerSnapshot = (): PipelineAsyncSnapshot<T> => idleSnapshot();

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

const resourceCache = new Map<string, PipelineAsyncResource<unknown>>();

function getPipelineAsyncResource<T>(cacheKey: string): PipelineAsyncResource<T> {
  const existing = resourceCache.get(cacheKey) as PipelineAsyncResource<T> | undefined;
  if (existing) return existing;
  const created = new PipelineAsyncResource<T>();
  resourceCache.set(cacheKey, created);
  return created;
}

export function usePipelineAsyncResource<T>(
  cacheKey: string,
  enabled: boolean,
  loader: () => Promise<T>,
): PipelineAsyncSnapshot<T> & { readonly refetch: () => void } {
  const resource = getPipelineAsyncResource<T>(cacheKey);

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
