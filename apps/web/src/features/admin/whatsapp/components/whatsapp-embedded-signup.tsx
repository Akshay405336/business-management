'use client';

import type { WhatsAppChannelTestResult, WhatsAppSetupInfo } from '@techwin/contracts';
import { Zap } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { completeEmbeddedSignup } from '../api/whatsapp';
import { describeWhatsAppError, generateVerifyToken } from '../utils/whatsapp-format';
import { WebhookSetupPanel } from './whatsapp-channel-dialogs';

type FacebookSdk = {
  init: (options: Record<string, unknown>) => void;
  login: (
    callback: (response: { authResponse?: { code?: string } | null }) => void,
    options: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

function loadSdk(appId: string, version: string): Promise<FacebookSdk> {
  if (window.FB) return Promise.resolve(window.FB);
  return new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      if (!window.FB) return reject(new Error('Facebook SDK failed to load.'));
      window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version });
      resolve(window.FB);
    };
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('Facebook SDK failed to load.'));
    document.body.appendChild(script);
  });
}

/**
 * Meta Embedded Signup. Only rendered when the server reports META_APP_ID,
 * META_EMBEDDED_SIGNUP_CONFIG_ID and META_APP_SECRET are configured. The
 * short-lived code is exchanged for a token on the server, never in the browser.
 */
export function EmbeddedSignupButton({
  setup,
  onConnected,
}: {
  setup: WhatsAppSetupInfo;
  onConnected: () => void;
}) {
  const sessionRef = useRef<{ phoneNumberId: string; wabaId: string } | null>(null);
  const [pending, setPending] = useState<{
    code: string;
    phoneNumberId: string;
    wabaId: string;
  } | null>(null);
  const [name, setName] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WhatsAppChannelTestResult | null>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!/(^|\.)facebook\.com$/.test(new URL(event.origin).hostname)) return;
      try {
        const data = (typeof event.data === 'string' ? JSON.parse(event.data) : event.data) as {
          type?: string;
          event?: string;
          data?: { phone_number_id?: string; waba_id?: string };
        };
        if (data.type === 'WA_EMBEDDED_SIGNUP' && data.event?.startsWith('FINISH') && data.data) {
          const { phone_number_id: phoneNumberId, waba_id: wabaId } = data.data;
          if (phoneNumberId && wabaId) sessionRef.current = { phoneNumberId, wabaId };
        }
      } catch {
        // Not an Embedded Signup message.
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const start = async () => {
    const { appId, configId } = setup.embeddedSignup;
    if (!appId || !configId) return;
    setError(null);
    try {
      const sdk = await loadSdk(appId, setup.graphApiVersion);
      sdk.login(
        (response) => {
          const code = response.authResponse?.code;
          const session = sessionRef.current;
          if (!code) return setError('Signup was cancelled.');
          if (!session)
            return setError('Meta did not return the business account details. Please try again.');
          setVerifyToken(generateVerifyToken());
          setPending({ code, ...session });
        },
        {
          config_id: configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: { setup: {}, sessionInfoVersion: '3' },
        },
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not start Embedded Signup.');
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const response = await completeEmbeddedSignup({
        name: name.trim() || 'WhatsApp',
        code: pending.code,
        businessAccountId: pending.wabaId,
        phoneNumberId: pending.phoneNumberId,
        verifyToken,
      });
      setResult(response);
      onConnected();
    } catch (failure) {
      setError(describeWhatsAppError(failure));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setPending(null);
    setResult(null);
    setName('');
    setError(null);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => void start()}
      >
        <Zap aria-hidden="true" />
        Embedded Signup
      </Button>
      {error && !pending ? <span className="text-xs text-red-600">{error}</span> : null}
      <Dialog open={pending !== null} onOpenChange={(open) => (open ? undefined : close())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Finish connecting</DialogTitle>
            <DialogDescription>
              Phone number ID {pending?.phoneNumberId} · Business account {pending?.wabaId}
            </DialogDescription>
          </DialogHeader>
          {result ? (
            <div className="grid gap-3">
              <p className="text-sm">{result.message}</p>
              <WebhookSetupPanel channel={result.channel} verifyToken={verifyToken} />
              <DialogFooter>
                <Button type="button" onClick={close}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
              <div className="grid gap-1.5">
                <Label htmlFor="es-name">Channel name</Label>
                <Input
                  id="es-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="es-verify">Webhook verify token</Label>
                <Input
                  id="es-verify"
                  className="font-mono"
                  value={verifyToken}
                  onChange={(event) => setVerifyToken(event.target.value)}
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Connecting…' : 'Connect'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
