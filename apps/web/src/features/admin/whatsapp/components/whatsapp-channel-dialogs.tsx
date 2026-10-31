'use client';

import type { WhatsAppChannelSummary, WhatsAppChannelTestResult } from '@techwin/contracts';
import {
  whatsappCreateChannelRequestSchema,
  whatsappRotateCredentialsRequestSchema,
} from '@techwin/validation';
import { CheckCircle2, KeyRound, RefreshCw, TriangleAlert } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { createWhatsAppChannel, rotateWhatsAppCredentials } from '../api/whatsapp';
import { describeWhatsAppError, generateVerifyToken } from '../utils/whatsapp-format';
import { CopyField } from './whatsapp-page-shell';

type FieldErrors = Partial<Record<string, string>>;

function zodFieldErrors(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form');
    errors[key] ??= issue.message;
  }
  return errors;
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

/** Shown once after setup: the verify token is stored hashed and cannot be displayed again. */
export function WebhookSetupPanel({
  channel,
  verifyToken,
}: {
  channel: WhatsAppChannelSummary;
  verifyToken: string | null;
}) {
  return (
    <div className="grid gap-2 rounded-lg border bg-neutral-50/60 p-3">
      <p className="text-sm font-medium">Configure the webhook in Meta</p>
      <p className="text-muted-foreground text-xs">
        In your Meta app go to WhatsApp → Configuration → Webhook, paste these values, then
        subscribe to the <code>messages</code> field (and{' '}
        <code>message_template_status_update</code> for template reviews).
      </p>
      <CopyField label="Callback URL" value={channel.webhookUrl} />
      {verifyToken ? (
        <CopyField label="Verify token (shown only now)" value={verifyToken} secret />
      ) : null}
      {!channel.webhookUrl.startsWith('http') ? (
        <p className="text-xs text-amber-700">
          WHATSAPP_WEBHOOK_BASE_URL is not set on the server, so this is a relative path. Prefix it
          with your public HTTPS API address.
        </p>
      ) : null}
    </div>
  );
}

export function ConnectChannelDialog({
  open,
  onOpenChange,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    businessAccountId: '',
    phoneNumberId: '',
    metaAppId: '',
    accessToken: '',
    appSecret: '',
    verifyToken: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<WhatsAppChannelTestResult | null>(null);
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);

  const reset = () => {
    setForm({
      name: '',
      businessAccountId: '',
      phoneNumberId: '',
      metaAppId: '',
      accessToken: '',
      appSecret: '',
      verifyToken: '',
    });
    setErrors({});
    setResult(null);
    setSubmittedToken(null);
  };

  const set = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = whatsappCreateChannelRequestSchema.safeParse({
      name: form.name,
      businessAccountId: form.businessAccountId,
      phoneNumberId: form.phoneNumberId,
      accessToken: form.accessToken,
      verifyToken: form.verifyToken,
      ...(form.metaAppId.trim() ? { metaAppId: form.metaAppId } : {}),
      ...(form.appSecret.trim() ? { appSecret: form.appSecret } : {}),
    });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error.issues));
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const response = await createWhatsAppChannel(parsed.data);
      setSubmittedToken(parsed.data.verifyToken);
      setForm((current) => ({ ...current, accessToken: '', appSecret: '' }));
      setResult(response);
      onConnected();
    } catch (error) {
      setErrors({ form: describeWhatsAppError(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect WhatsApp channel</DialogTitle>
          <DialogDescription>
            Uses the official WhatsApp Business Cloud API. Credentials are encrypted on the server
            and never shown again.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="grid gap-3">
            <Alert variant={result.ok ? 'info' : 'destructive'}>
              {result.ok ? (
                <CheckCircle2 aria-hidden="true" />
              ) : (
                <TriangleAlert aria-hidden="true" />
              )}
              <AlertTitle>
                {result.ok ? 'Channel saved' : 'Channel saved with a problem'}
              </AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
            <WebhookSetupPanel channel={result.channel} verifyToken={submittedToken} />
            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={(event) => void submit(event)} autoComplete="off">
            <Field id="wa-name" label="Channel name" error={errors.name}>
              <Input
                id="wa-name"
                value={form.name}
                onChange={set('name')}
                placeholder="Sales WhatsApp"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="wa-waba"
                label="WhatsApp Business Account ID"
                error={errors.businessAccountId}
              >
                <Input
                  id="wa-waba"
                  inputMode="numeric"
                  value={form.businessAccountId}
                  onChange={set('businessAccountId')}
                />
              </Field>
              <Field id="wa-phone" label="Phone number ID" error={errors.phoneNumberId}>
                <Input
                  id="wa-phone"
                  inputMode="numeric"
                  value={form.phoneNumberId}
                  onChange={set('phoneNumberId')}
                />
              </Field>
            </div>
            <Field
              id="wa-token"
              label="Access token"
              hint="Use a permanent System User token with whatsapp_business_messaging and whatsapp_business_management."
              error={errors.accessToken}
            >
              <Input
                id="wa-token"
                type="password"
                value={form.accessToken}
                onChange={set('accessToken')}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="wa-app" label="Meta App ID (optional)" error={errors.metaAppId}>
                <Input
                  id="wa-app"
                  inputMode="numeric"
                  value={form.metaAppId}
                  onChange={set('metaAppId')}
                />
              </Field>
              <Field
                id="wa-secret"
                label="App secret (optional)"
                hint="Needed to verify webhook signatures unless META_APP_SECRET is set on the server."
                error={errors.appSecret}
              >
                <Input
                  id="wa-secret"
                  type="password"
                  value={form.appSecret}
                  onChange={set('appSecret')}
                />
              </Field>
            </div>
            <Field
              id="wa-verify"
              label="Webhook verify token"
              hint="Any random string; you will paste the same value into Meta."
              error={errors.verifyToken}
            >
              <div className="flex gap-2">
                <Input
                  id="wa-verify"
                  value={form.verifyToken}
                  onChange={set('verifyToken')}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setForm((current) => ({ ...current, verifyToken: generateVerifyToken() }))
                  }
                >
                  <RefreshCw aria-hidden="true" />
                  Generate
                </Button>
              </div>
            </Field>
            {errors.form ? <p className="text-sm text-red-600">{errors.form}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Verifying with Meta…' : 'Connect channel'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RotateCredentialsDialog({
  channel,
  onOpenChange,
  onRotated,
}: {
  channel: WhatsAppChannelSummary | null;
  onOpenChange: (open: boolean) => void;
  onRotated: (result: WhatsAppChannelTestResult) => void;
}) {
  const [form, setForm] = useState({ accessToken: '', appSecret: '', verifyToken: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [newVerifyToken, setNewVerifyToken] = useState<string | null>(null);
  const [done, setDone] = useState<WhatsAppChannelTestResult | null>(null);

  const close = () => {
    setForm({ accessToken: '', appSecret: '', verifyToken: '' });
    setErrors({});
    setNewVerifyToken(null);
    setDone(null);
    onOpenChange(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!channel) return;
    const parsed = whatsappRotateCredentialsRequestSchema.safeParse({
      ...(form.accessToken.trim() ? { accessToken: form.accessToken } : {}),
      ...(form.appSecret.trim() ? { appSecret: form.appSecret } : {}),
      ...(form.verifyToken.trim() ? { verifyToken: form.verifyToken } : {}),
    });
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error.issues));
      return;
    }
    setSubmitting(true);
    setErrors({});
    try {
      const result = await rotateWhatsAppCredentials(channel.id, parsed.data);
      setNewVerifyToken(parsed.data.verifyToken ?? null);
      setForm({ accessToken: '', appSecret: '', verifyToken: '' });
      setDone(result);
      onRotated(result);
    } catch (error) {
      setErrors({ form: describeWhatsAppError(error) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={channel !== null} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" aria-hidden="true" />
            Rotate credentials
          </DialogTitle>
          <DialogDescription>
            Fill in only what you want to replace. Current values are never displayed. A new access
            token reconnects a disconnected channel.
          </DialogDescription>
        </DialogHeader>
        {done && channel ? (
          <div className="grid gap-3">
            <Alert variant={done.ok ? 'info' : 'destructive'}>
              <AlertTitle>
                {done.ok ? 'Credentials updated' : 'Updated, but verification failed'}
              </AlertTitle>
              <AlertDescription>{done.message}</AlertDescription>
            </Alert>
            {newVerifyToken ? (
              <WebhookSetupPanel channel={done.channel} verifyToken={newVerifyToken} />
            ) : null}
            <DialogFooter>
              <Button type="button" onClick={close}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="grid gap-3" onSubmit={(event) => void submit(event)} autoComplete="off">
            <Field id="rot-token" label="New access token" error={errors.accessToken}>
              <Input
                id="rot-token"
                type="password"
                placeholder={channel?.accessTokenMasked ?? 'Not set'}
                value={form.accessToken}
                onChange={(event) => setForm((c) => ({ ...c, accessToken: event.target.value }))}
              />
            </Field>
            <Field id="rot-secret" label="New app secret" error={errors.appSecret}>
              <Input
                id="rot-secret"
                type="password"
                placeholder={channel?.hasAppSecret ? '••••••••' : 'Not set'}
                value={form.appSecret}
                onChange={(event) => setForm((c) => ({ ...c, appSecret: event.target.value }))}
              />
            </Field>
            <Field
              id="rot-verify"
              label="New webhook verify token"
              hint="Changing it requires re-verifying the webhook in Meta."
              error={errors.verifyToken}
            >
              <div className="flex gap-2">
                <Input
                  id="rot-verify"
                  className="font-mono"
                  value={form.verifyToken}
                  onChange={(event) => setForm((c) => ({ ...c, verifyToken: event.target.value }))}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForm((c) => ({ ...c, verifyToken: generateVerifyToken() }))}
                >
                  Generate
                </Button>
              </div>
            </Field>
            {errors.form ? <p className="text-sm text-red-600">{errors.form}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save credentials'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
