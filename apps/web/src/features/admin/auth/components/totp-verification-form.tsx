'use client';

import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TOTP_CODE_LENGTH } from '../schemas/totp.schema';
import { useTotpVerification } from '../hooks/use-totp-verification';
import { TotpCodeInput } from './totp-code-input';

export function TotpVerificationForm() {
  const setup = useSearchParams().get('setup') === '1';
  const { code, error, isVerifying, isComplete, onCodeChange, submit } = useTotpVerification();
  const errorId = 'totp-error';
  const hintId = 'totp-hint';
  const headingId = 'totp-heading';
  const busy = isVerifying || isComplete;

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 id={headingId} className="type-page-title">
          Verify your identity
        </h1>
        <p id={hintId} className="text-muted-foreground text-sm">
          {setup
            ? `Enter the ${TOTP_CODE_LENGTH}-digit code from the authenticator app you enrolled during setup.`
            : `Enter the ${TOTP_CODE_LENGTH}-digit code from your authenticator app.`}
        </p>
      </header>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden="true" />
          <AlertDescription id={errorId}>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="grid gap-6"
        aria-busy={busy}
      >
        <TotpCodeInput
          value={code}
          onChange={onCodeChange}
          length={TOTP_CODE_LENGTH}
          disabled={busy}
          invalid={Boolean(error)}
          autoFocus
          labelledBy={headingId}
          describedBy={error ? errorId : hintId}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={busy || code.length !== TOTP_CODE_LENGTH}
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Verifying...
            </>
          ) : (
            'Verify'
          )}
        </Button>
      </form>

      <Button variant="ghost" className="text-muted-foreground justify-self-start" asChild>
        <Link href="/admin/login">
          <ArrowLeft aria-hidden="true" />
          Back to login
        </Link>
      </Button>
    </div>
  );
}
