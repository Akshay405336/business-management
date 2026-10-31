'use client';

import type { WhatsAppRealtimeEvent } from '@techwin/contracts';
import { useEffect, useRef, useState } from 'react';
import { isApiError } from '@/shared/api/api-error';
import { pollWhatsAppEvents } from '../api/whatsapp';

const WAIT_MS = 10_000;
const MAX_BACKOFF_MS = 30_000;

export type RealtimeState = 'connecting' | 'live' | 'reconnecting';

/**
 * Long-polls inbox events with the last cursor, so a reconnect catches up on
 * everything missed. `onResync` fires when the server says the gap is too large.
 */
export function useWhatsAppRealtime(handlers: {
  onEvents: (events: readonly WhatsAppRealtimeEvent[]) => void;
  onResync: () => void;
}): RealtimeState {
  const [state, setState] = useState<RealtimeState>('connecting');
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const controller = new AbortController();
    let cursor: string | null = null;
    let failures = 0;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        controller.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          resolve();
        });
      });

    const run = async () => {
      while (!controller.signal.aborted) {
        try {
          const response = await pollWhatsAppEvents(
            cursor,
            cursor === null ? 0 : WAIT_MS,
            controller.signal,
          );
          failures = 0;
          setState('live');
          if (response.resync) handlersRef.current.onResync();
          cursor = response.cursor;
          if (response.events.length > 0) handlersRef.current.onEvents(response.events);
          if (document.hidden) await sleep(2_000);
        } catch (error) {
          if (controller.signal.aborted) return;
          if (isApiError(error) && (error.status === 401 || error.status === 403)) {
            setState('reconnecting');
            await sleep(MAX_BACKOFF_MS);
            continue;
          }
          failures += 1;
          setState('reconnecting');
          await sleep(Math.min(MAX_BACKOFF_MS, 1_000 * 2 ** Math.min(failures, 5)));
        }
      }
    };
    void run();
    return () => controller.abort();
  }, []);

  return state;
}
