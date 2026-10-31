'use client';

import type { WhatsAppChannelSummary, WhatsAppConversationDetail } from '@techwin/contracts';
import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { startWhatsAppConversation } from '../api/whatsapp';
import { describeWhatsAppError } from '../utils/whatsapp-format';

export function StartConversationDialog({
  open,
  channels,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  channels: readonly WhatsAppChannelSummary[];
  onOpenChange: (open: boolean) => void;
  onStarted: (detail: WhatsAppConversationDetail) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            Businesses can only start WhatsApp conversations with an approved template, and the
            contact must have opted in. Record their opt-in from the contact panel before sending.
          </DialogDescription>
        </DialogHeader>
        <StartConversationForm
          channels={channels}
          onCancel={() => onOpenChange(false)}
          onStarted={(detail) => {
            onStarted(detail);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function StartConversationForm({
  channels,
  onCancel,
  onStarted,
}: {
  channels: readonly WhatsAppChannelSummary[];
  onCancel: () => void;
  onStarted: (detail: WhatsAppConversationDetail) => void;
}) {
  const usable = channels.filter((channel) => channel.status !== 'DISCONNECTED');
  const [channelId, setChannelId] = useState(() => usable[0]?.id ?? '');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!channelId || phone.trim().length < 6) return;
    setSaving(true);
    setError(null);
    try {
      const detail = await startWhatsAppConversation({
        channelId,
        phone: phone.trim(),
        profileName: name.trim() || undefined,
      });
      onStarted(detail);
    } catch (failure) {
      setError(describeWhatsAppError(failure));
      setSaving(false);
    }
  };

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="grid gap-1.5">
        <Label>Channel</Label>
        <Select value={channelId} onValueChange={setChannelId}>
          <SelectTrigger aria-label="Channel">
            <SelectValue placeholder="Choose a channel" />
          </SelectTrigger>
          <SelectContent>
            {usable.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.name} · {channel.displayPhoneNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="wa-start-phone">Phone number</Label>
        <Input
          id="wa-start-phone"
          inputMode="tel"
          placeholder="+91 98765 43210"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">Include the country code.</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="wa-start-name">Name (optional)</Label>
        <Input id="wa-start-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !channelId || phone.trim().length < 6}>
          {saving ? 'Starting…' : 'Start conversation'}
        </Button>
      </DialogFooter>
    </form>
  );
}
