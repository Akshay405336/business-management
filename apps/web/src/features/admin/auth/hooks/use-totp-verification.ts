'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { verifyTotp } from '../api/verify-totp';
import { TOTP_CODE_LENGTH, totpSchema } from '../schemas/totp.schema';
import { describeAuthError, isChallengeExpired, loginPath } from '../utils/auth-errors';

export function useTotpVerification() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const inFlight = useRef(false);

  const submit = useCallback(
    async (candidate: string) => {
      if (inFlight.current || isComplete) return;
      const parsed = totpSchema.safeParse({ code: candidate });
      if (!parsed.success) {
        setError(`Enter the ${TOTP_CODE_LENGTH}-digit code from your authenticator app.`);
        return;
      }

      inFlight.current = true;
      setIsVerifying(true);
      setError(null);
      try {
        await verifyTotp(parsed.data);
        setIsComplete(true);
        router.replace('/admin/dashboard');
      } catch (failure) {
        if (isChallengeExpired(failure)) {
          router.replace(loginPath('challenge_expired'));
          return;
        }
        setCode('');
        setError(describeAuthError(failure));
      } finally {
        inFlight.current = false;
        setIsVerifying(false);
      }
    },
    [isComplete, router],
  );

  const onCodeChange = useCallback(
    (next: string) => {
      setCode(next);
      if (error) setError(null);
      if (next.length === TOTP_CODE_LENGTH) void submit(next);
    },
    [error, submit],
  );

  return {
    code,
    error,
    isVerifying,
    isComplete,
    onCodeChange,
    submit: () => submit(code),
  };
}
