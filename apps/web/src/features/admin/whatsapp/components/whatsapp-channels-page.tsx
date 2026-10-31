'use client';

import type { WhatsAppChannelSummary, WhatsAppSetupInfo } from '@techwin/contracts';
import {
  CircleAlert,
  KeyRound,
  Link2Off,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wifi,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminToast } from '@/features/admin/components/toast';
import { cn } from '@/shared/lib/utils';
import {
  deleteWhatsAppChannel,
  disconnectWhatsAppChannel,
  fetchWhatsAppSetup,
  listWhatsAppChannels,
  renameWhatsAppChannel,
  syncWhatsAppTemplates,
  testWhatsAppChannel,
} from '../api/whatsapp';
import {
  CHANNEL_STATUS_META,
  describeWhatsAppError,
  formatDateTime,
} from '../utils/whatsapp-format';
import { ConnectChannelDialog, RotateCredentialsDialog } from './whatsapp-channel-dialogs';
import { EmbeddedSignupButton } from './whatsapp-embedded-signup';
import { CopyField, WhatsAppPageShell } from './whatsapp-page-shell';

type ConfirmAction = { kind: 'disconnect' | 'delete'; channel: WhatsAppChannelSummary } | null;

export function WhatsAppChannelsPage() {
  const toast = useAdminToast();
  const [setup, setSetup] = useState<WhatsAppSetupInfo | null>(null);
  const [channels, setChannels] = useState<readonly WhatsAppChannelSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [rotateChannel, setRotateChannel] = useState<WhatsAppChannelSummary | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([fetchWhatsAppSetup(), listWhatsAppChannels()])
        .then(([setupInfo, list]) => {
          setSetup(setupInfo);
          setChannels(list.channels);
          setLoadError(null);
        })
        .catch((error: unknown) => {
          setLoadError(describeWhatsAppError(error, 'Could not load WhatsApp channels.'));
        }),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<string>) => {
    setBusy(key);
    try {
      toast.success(await action());
      await load();
    } catch (error) {
      toast.error(describeWhatsAppError(error));
      await load();
    } finally {
      setBusy(null);
    }
  };

  const test = (channel: WhatsAppChannelSummary) =>
    run(`test:${channel.id}`, async () => {
      const result = await testWhatsAppChannel(channel.id);
      if (!result.ok) throw new Error(result.message);
      return result.message;
    });

  const sync = (channel: WhatsAppChannelSummary) =>
    run(`sync:${channel.id}`, async () => {
      const result = await syncWhatsAppTemplates(channel.id);
      return `Synced ${result.synced} template(s)${result.removed ? `, ${result.removed} no longer in Meta` : ''}.`;
    });

  const confirmAction = async () => {
    if (!confirm) return;
    const { kind, channel } = confirm;
    setConfirm(null);
    await run(`${kind}:${channel.id}`, async () => {
      if (kind === 'disconnect') {
        await disconnectWhatsAppChannel(channel.id);
        return 'Channel disconnected. The stored access token was removed.';
      }
      await deleteWhatsAppChannel(channel.id);
      return 'Channel deleted. Conversation history was kept.';
    });
  };

  return (
    <WhatsAppPageShell
      title="WhatsApp Channels"
      description="Connect WhatsApp Business numbers through the official Meta Cloud API."
      toolbar={
        <>
          {setup?.embeddedSignup.available ? (
            <EmbeddedSignupButton setup={setup} onConnected={() => void load()} />
          ) : null}
          <Button type="button" size="sm" className="h-9" onClick={() => setConnectOpen(true)}>
            <Plus aria-hidden="true" />
            Connect channel
          </Button>
        </>
      }
    >
      {setup && !setup.credentialEncryptionConfigured ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Credential encryption is not configured</AlertTitle>
          <AlertDescription>
            Set WHATSAPP_CREDENTIALS_ENCRYPTION_KEY on the API server before connecting a channel.
          </AlertDescription>
        </Alert>
      ) : null}
      {setup && !setup.webhookBaseUrl ? (
        <Alert variant="info">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Public webhook URL not configured</AlertTitle>
          <AlertDescription>
            Set WHATSAPP_WEBHOOK_BASE_URL to the public HTTPS address of the API so Meta can deliver
            messages.
          </AlertDescription>
        </Alert>
      ) : null}
      {setup && !setup.embeddedSignup.available ? (
        <p className="text-muted-foreground px-1 text-xs">
          Embedded Signup is unavailable until {setup.embeddedSignup.missing.join(', ')}{' '}
          {setup.embeddedSignup.missing.length > 1 ? 'are' : 'is'} configured on the server. Manual
          setup works without it.
        </p>
      ) : null}

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load channels</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      {channels === null && !loadError ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : null}

      {channels && channels.length === 0 ? (
        <div className="workspace-surface grid place-items-center gap-2 px-6 py-14 text-center">
          <Smartphone className="text-muted-foreground size-8" aria-hidden="true" />
          <p className="font-medium">No WhatsApp channels yet</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Connect a WhatsApp Business phone number with its Business Account ID, Phone Number ID
            and a System User access token.
          </p>
          <Button type="button" size="sm" className="mt-2" onClick={() => setConnectOpen(true)}>
            <Plus aria-hidden="true" />
            Connect channel
          </Button>
        </div>
      ) : null}

      {channels && channels.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              busy={busy}
              onTest={() => void test(channel)}
              onSync={() => void sync(channel)}
              onRotate={() => setRotateChannel(channel)}
              onDisconnect={() => setConfirm({ kind: 'disconnect', channel })}
              onDelete={() => setConfirm({ kind: 'delete', channel })}
              onRenamed={() => void load()}
            />
          ))}
        </div>
      ) : null}

      <ConnectChannelDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConnected={() => void load()}
      />
      <RotateCredentialsDialog
        channel={rotateChannel}
        onOpenChange={(open) => (open ? undefined : setRotateChannel(null))}
        onRotated={() => void load()}
      />
      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => (open ? undefined : setConfirm(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === 'delete' ? 'Delete this channel?' : 'Disconnect this channel?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === 'delete'
                ? 'All stored credentials are wiped, scheduled broadcasts are cancelled and incoming webhooks stop. Conversation history stays available.'
                : 'The stored access token is removed and messages can no longer be sent. Rotate the access token later to reconnect.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmAction()}
            >
              {confirm?.kind === 'delete' ? 'Delete channel' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WhatsAppPageShell>
  );
}

function ChannelCard({
  channel,
  busy,
  onTest,
  onSync,
  onRotate,
  onDisconnect,
  onDelete,
  onRenamed,
}: {
  channel: WhatsAppChannelSummary;
  busy: string | null;
  onTest: () => void;
  onSync: () => void;
  onRotate: () => void;
  onDisconnect: () => void;
  onDelete: () => void;
  onRenamed: () => void;
}) {
  const toast = useAdminToast();
  const status = CHANNEL_STATUS_META[channel.status];
  const disconnected = channel.status === 'DISCONNECTED';
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(channel.name);

  const saveName = async () => {
    if (!name.trim() || name.trim() === channel.name) return setEditing(false);
    try {
      await renameWhatsAppChannel(channel.id, name.trim());
      setEditing(false);
      onRenamed();
    } catch (error) {
      toast.error(describeWhatsAppError(error));
    }
  };

  return (
    <article className="workspace-surface grid gap-3 p-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Smartphone className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            {editing ? (
              <div className="flex gap-1.5">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-8"
                  autoFocus
                />
                <Button type="button" size="sm" onClick={() => void saveName()}>
                  Save
                </Button>
              </div>
            ) : (
              <h3 className="flex items-center gap-1.5 truncate font-semibold">
                {channel.name}
                <button
                  type="button"
                  aria-label="Rename channel"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
              </h3>
            )}
            <p className="text-muted-foreground truncate text-sm">
              {channel.displayPhoneNumber || 'Phone not verified yet'}
              {channel.verifiedName ? ` · ${channel.verifiedName}` : ''}
            </p>
          </div>
        </div>
        <Badge className={cn('shrink-0', status.className)}>{status.label}</Badge>
      </header>

      {channel.lastErrorMessage ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {channel.lastErrorMessage}
        </p>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Detail label="Business Account ID" value={channel.businessAccountId} />
        <Detail label="Phone Number ID" value={channel.phoneNumberId} />
        <Detail label="Access token" value={channel.accessTokenMasked ?? 'Not stored'} />
        <Detail
          label="App secret"
          value={channel.hasAppSecret ? 'Stored (encrypted)' : 'Server default'}
        />
        <Detail label="Quality rating" value={channel.qualityRating ?? '—'} />
        <Detail label="Messaging tier" value={channel.messagingLimitTier ?? '—'} />
        <Detail label="Last verified" value={formatDateTime(channel.lastVerifiedAt)} />
        <Detail label="Webhook verified" value={formatDateTime(channel.webhookVerifiedAt)} />
        <Detail label="Last webhook" value={formatDateTime(channel.lastWebhookAt)} />
        <Detail label="Templates synced" value={formatDateTime(channel.templatesSyncedAt)} />
      </dl>

      {!disconnected ? <CopyField label="Webhook callback URL" value={channel.webhookUrl} /> : null}

      <footer className="flex flex-wrap gap-2 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disconnected || busy !== null}
          onClick={onTest}
        >
          <Wifi aria-hidden="true" />
          {busy === `test:${channel.id}` ? 'Testing…' : 'Test connection'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disconnected || busy !== null}
          onClick={onSync}
        >
          <RefreshCw aria-hidden="true" />
          {busy === `sync:${channel.id}` ? 'Syncing…' : 'Sync templates'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={onRotate}
        >
          <KeyRound aria-hidden="true" />
          {disconnected ? 'Reconnect' : 'Rotate credentials'}
        </Button>
        {!disconnected ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy !== null}
            onClick={onDisconnect}
          >
            <Link2Off aria-hidden="true" />
            Disconnect
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto text-red-600 hover:text-red-700"
          disabled={busy !== null}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
          Delete
        </Button>
      </footer>
      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        Credentials are encrypted at rest and never sent to the browser. {
          channel.conversationCount
        }{' '}
        conversation(s).
      </p>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}
