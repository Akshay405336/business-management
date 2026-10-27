'use client';

import { acceptInvitationRequestSchema } from '@techwin/validation';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthFormField } from '@/features/admin/auth/components/auth-form-field';
import { focusFirstInvalidField, formControlStateClass } from '@/shared/form/form-control-state';
import { clearFormFieldError, zodErrorToFieldMap } from '@/shared/form/zod-field-error';
import { cn } from '@/shared/lib/utils';
import { acceptOrgInvitation } from '../api/org-access';
import { describeOrgAccessError } from '../utils/errors';

export function AcceptInvitationForm() {
  const router = useRouter();
  const tokenParam = useSearchParams().get('token') ?? '';
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    const parsed = acceptInvitationRequestSchema.safeParse({
      acceptToken: tokenParam.trim(),
      displayName: displayName.trim(),
      password,
    });
    if (!parsed.success) {
      setFieldErrors(zodErrorToFieldMap(parsed.error));
      focusFirstInvalidField();
      return;
    }
    setPending(true);
    try {
      await acceptOrgInvitation(parsed.data);
      router.replace('/admin/login?reason=invitation_accepted');
    } catch (failure) {
      setFormError(describeOrgAccessError(failure));
    } finally {
      setPending(false);
    }
  };

  if (!tokenParam.trim()) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircle aria-hidden="true" />
        <AlertDescription>This invitation link is missing a token. Ask your administrator to resend the invite.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="grid gap-5" aria-busy={pending}>
      {formError ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <AuthFormField id="displayName" label="Your name" error={fieldErrors.displayName}>
        {(control) => (
          <Input
            {...control}
            value={displayName}
            onChange={(event) => {
              clearFormFieldError(setFieldErrors, 'displayName');
              setDisplayName(event.target.value);
            }}
            autoComplete="name"
            disabled={pending}
            className={formControlStateClass(fieldErrors.displayName ? 'invalid' : 'neutral')}
          />
        )}
      </AuthFormField>

      <AuthFormField id="password" label="Password" error={fieldErrors.password}>
        {(control) => (
          <div className="relative">
            <Input
              {...control}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                clearFormFieldError(setFieldErrors, 'password');
                setPassword(event.target.value);
              }}
              autoComplete="new-password"
              disabled={pending}
              className={cn(
                formControlStateClass(fieldErrors.password ? 'invalid' : 'neutral'),
                'pr-11',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md outline-none focus-visible:ring-[3px]"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
        )}
      </AuthFormField>

      <p className="text-muted-foreground text-sm">
        After you create your account, sign in with this password and enroll your authenticator app on the next screen.
      </p>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Creating account...
          </>
        ) : (
          'Accept invitation'
        )}
      </Button>
    </form>
  );
}
