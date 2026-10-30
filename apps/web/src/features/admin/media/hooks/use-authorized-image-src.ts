'use client';

import { useEffect, useState } from 'react';
import {
  loadAuthorizedImageBlobUrl,
  peekAuthorizedImageBlobUrl,
  requiresAuthorizedImageFetch,
} from '../authorized-image-cache';

export function useAuthorizedImageSrc(resolved: string | null): {
  readonly displaySrc: string | null;
  readonly loading: boolean;
  readonly failed: boolean;
} {
  const cachedImmediately = resolved ? peekAuthorizedImageBlobUrl(resolved) : null;
  const [displaySrc, setDisplaySrc] = useState<string | null>(cachedImmediately);
  const [loading, setLoading] = useState(
    Boolean(resolved && requiresAuthorizedImageFetch(resolved) && !cachedImmediately),
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!resolved) {
      setDisplaySrc(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    if (!requiresAuthorizedImageFetch(resolved)) {
      setDisplaySrc(resolved);
      setLoading(false);
      setFailed(false);
      return;
    }

    const cached = peekAuthorizedImageBlobUrl(resolved);
    if (cached) {
      setDisplaySrc(cached);
      setLoading(false);
      setFailed(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setDisplaySrc(null);

    void loadAuthorizedImageBlobUrl(resolved, controller.signal)
      .then((url) => {
        if (controller.signal.aborted) return;
        setDisplaySrc(url);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setDisplaySrc(null);
        setLoading(false);
        setFailed(true);
      });

    return () => {
      controller.abort();
    };
  }, [resolved]);

  return { displaySrc, loading, failed };
}
