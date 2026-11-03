'use client';

import { AlertCircle, Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminLogin } from '../hooks/use-admin-login';
import { loginNoticeMessage, parseLoginNotice } from '../utils/auth-errors';
import { AuthFormField } from './auth-form-field';
import { LoginSessionGate } from './login-session-gate';

export function PlatformLoginForm() {
  return (
    <LoginSessionGate>
      <PlatformLoginFormInner />
    </LoginSessionGate>
  );
}

function PlatformLoginFormInner() {
  const notice = parseLoginNotice(useSearchParams().get('reason'));
  const { form, formError, onSubmit, isSubmitting } = useAdminLogin();
  const [showPassword, setShowPassword] = useState(false);
  const { errors } = form.formState;

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="type-page-title">Sign in to Techwin</h1>
        <p className="text-muted-foreground text-sm">
          Use your organization email and password. Platform Super Admin accounts also confirm with
          an authenticator app.
        </p>
      </header>

      {formError ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : notice ? (
        <Alert variant="info" role="status">
          <Info aria-hidden="true" />
          <AlertDescription>{loginNoticeMessage(notice)}</AlertDescription>
        </Alert>
      ) : null}

      <form
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="grid gap-5"
        aria-busy={isSubmitting}
      >
        <AuthFormField id="email" label="Email" error={errors.email?.message}>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@company.com"
              autoFocus
              disabled={isSubmitting}
              {...form.register('email')}
            />
          )}
        </AuthFormField>

        <AuthFormField id="password" label="Password" error={errors.password?.message}>
          {(control) => (
            <div className="relative">
              <Input
                {...control}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="pr-11"
                disabled={isSubmitting}
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md outline-none focus-visible:ring-[3px]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                aria-controls="password"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </AuthFormField>

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-xs">
        Need help signing in? Contact your organization administrator or platform Super Admin.
      </p>
      <p className="text-muted-foreground text-center text-xs">
        <Link href="/admin/accept-invite" className="text-foreground underline underline-offset-2">
          Accept an invitation
        </Link>
      </p>
    </div>
  );
}

/** @deprecated Use PlatformLoginForm */
export const AdminLoginForm = PlatformLoginForm;
