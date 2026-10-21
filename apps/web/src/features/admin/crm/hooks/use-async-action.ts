'use client';

import { useCallback, useState } from 'react';

export function useAsyncAction() {
  const [pending, setPending] = useState(false);

  const run = useCallback(async <T>(task: () => Promise<T>): Promise<T | undefined> => {
    setPending(true);
    try {
      return await task();
    } finally {
      setPending(false);
    }
  }, []);

  return { pending, run };
}
