'use client';

import type {
  WhatsAppAssigneeSummary,
  WhatsAppConversationDetail,
  WhatsAppCrmLink,
} from '@techwin/contracts';
import { ExternalLink, Link2, Link2Off, ShieldCheck, ShieldOff, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/shared/lib/utils';
import { CONSENT_META, formatDateTime, initialsOf } from '../utils/whatsapp-format';

function crmHref(link: WhatsAppCrmLink): string {
  return link.kind === 'LEAD' ? `/admin/leads/${link.id}` : `/admin/clients/${link.id}`;
}

export function WhatsAppContactPanel({
  detail,
  assignees,
  currentEmployeeId,
  onAssign,
  onConsent,
  onCrmLink,
}: {
  detail: WhatsAppConversationDetail;
  assignees: readonly WhatsAppAssigneeSummary[];
  currentEmployeeId: string | null;
  onAssign: (employeeId: string | null) => Promise<void>;
  onConsent: (status: 'OPTED_IN' | 'OPTED_OUT', source: string) => Promise<void>;
  onCrmLink: (kind: 'LEAD' | 'CLIENT', id: string | null) => Promise<void>;
}) {
  const { conversation, canAssign, canReply } = detail;
  const contact = conversation.contact;
  const consent = CONSENT_META[contact.consentStatus];
  const [consentDialog, setConsentDialog] = useState<'OPTED_IN' | 'OPTED_OUT' | null>(null);
  const [source, setSource] = useState('');
  const [saving, setSaving] = useState(false);

  const assignable = canAssign
    ? assignees
    : assignees.filter((assignee) => assignee.employeeId === currentEmployeeId);

  const saveConsent = async () => {
    if (!consentDialog || source.trim().length < 3) return;
    setSaving(true);
    try {
      await onConsent(consentDialog, source.trim());
      setConsentDialog(null);
      setSource('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <aside className="grid content-start gap-4 overflow-y-auto border-l bg-white p-4">
      <div className="grid justify-items-center gap-2 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-emerald-100 text-lg font-semibold text-emerald-800">
          {initialsOf(contact.displayName)}
        </span>
        <div>
          <p className="font-semibold">{contact.displayName}</p>
          <p className="text-muted-foreground text-sm">{contact.phoneE164}</p>
          {contact.profileName && contact.profileName !== contact.displayName ? (
            <p className="text-muted-foreground text-xs">WhatsApp name: {contact.profileName}</p>
          ) : null}
        </div>
      </div>

      <section className="grid gap-2">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Assignment
        </h4>
        <Select
          value={conversation.assignee?.employeeId ?? '__none__'}
          disabled={!canAssign && conversation.assignee !== null}
          onValueChange={(value) => void onAssign(value === '__none__' ? null : value)}
        >
          <SelectTrigger className="h-9" aria-label="Assigned agent">
            <UserRound className="text-muted-foreground size-4" aria-hidden="true" />
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            {canAssign ? <SelectItem value="__none__">Unassigned</SelectItem> : null}
            {conversation.assignee &&
            !assignable.some((a) => a.employeeId === conversation.assignee?.employeeId) ? (
              <SelectItem value={conversation.assignee.employeeId}>
                {conversation.assignee.displayName}
              </SelectItem>
            ) : null}
            {assignable.map((assignee) => (
              <SelectItem key={assignee.employeeId} value={assignee.employeeId}>
                {assignee.displayName}
                {assignee.employeeId === currentEmployeeId ? ' (me)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!canAssign && !currentEmployeeId ? (
          <p className="text-muted-foreground text-xs">
            Link your account to an employee profile to take conversations.
          </p>
        ) : null}
      </section>

      <section className="grid gap-2">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Messaging consent
        </h4>
        <div className="flex items-center justify-between gap-2">
          <Badge className={consent.className}>{consent.label}</Badge>
          <span className="text-muted-foreground text-[11px]">
            {formatDateTime(contact.consentUpdatedAt)}
          </span>
        </div>
        {contact.consentSource ? (
          <p className="text-muted-foreground text-xs">Source: {contact.consentSource}</p>
        ) : null}
        {canReply ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={contact.consentStatus === 'OPTED_IN'}
              onClick={() => setConsentDialog('OPTED_IN')}
            >
              <ShieldCheck aria-hidden="true" />
              Record opt-in
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={contact.consentStatus === 'OPTED_OUT'}
              onClick={() => setConsentDialog('OPTED_OUT')}
            >
              <ShieldOff aria-hidden="true" />
              Opt out
            </Button>
          </div>
        ) : null}
      </section>

      <section className="grid gap-2">
        <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">CRM</h4>
        {contact.crmLinks.length === 0 ? (
          <p className="text-muted-foreground text-xs">Not linked to a lead or client.</p>
        ) : null}
        {contact.crmLinks.map((link) => (
          <div
            key={`${link.kind}-${link.id}`}
            className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm"
          >
            <Badge variant="outline">{link.kind === 'LEAD' ? 'Lead' : 'Client'}</Badge>
            <Link
              href={crmHref(link)}
              className="min-w-0 flex-1 truncate font-medium hover:underline"
            >
              {link.name}
            </Link>
            <ExternalLink className="text-muted-foreground size-3.5" aria-hidden="true" />
            {canReply ? (
              <button
                type="button"
                aria-label="Unlink"
                className="text-muted-foreground hover:text-red-600"
                onClick={() => void onCrmLink(link.kind, null)}
              >
                <Link2Off className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ))}
        {contact.crmMatches.length > 0 ? (
          <div className="grid gap-1.5">
            <p className="text-muted-foreground text-xs">
              Possible matches with the same phone number:
            </p>
            {contact.crmMatches.map((match) => (
              <div
                key={`${match.kind}-${match.id}`}
                className="flex items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-sm"
              >
                <Badge variant="outline">{match.kind === 'LEAD' ? 'Lead' : 'Client'}</Badge>
                <span className="min-w-0 flex-1 truncate">
                  {match.name}{' '}
                  <span className="text-muted-foreground text-xs">{match.referenceNumber}</span>
                </span>
                {canReply ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void onCrmLink(match.kind, match.id)}
                  >
                    <Link2 aria-hidden="true" />
                    Link
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-1 text-xs">
        <h4 className="text-muted-foreground mb-1 font-semibold tracking-wide uppercase">
          Conversation
        </h4>
        <p>
          <span className="text-muted-foreground">Channel:</span> {conversation.channelName}
        </p>
        <p>
          <span className="text-muted-foreground">Started:</span>{' '}
          {formatDateTime(conversation.createdAt)}
        </p>
        <p>
          <span className="text-muted-foreground">Last customer message:</span>{' '}
          {formatDateTime(conversation.lastInboundAt)}
        </p>
        <p
          className={cn(
            conversation.serviceWindowEndsAt &&
              new Date(conversation.serviceWindowEndsAt) < new Date() &&
              'text-amber-700',
          )}
        >
          <span className="text-muted-foreground">Service window ends:</span>{' '}
          {formatDateTime(conversation.serviceWindowEndsAt)}
        </p>
      </section>

      <Dialog
        open={consentDialog !== null}
        onOpenChange={(open) => (open ? undefined : setConsentDialog(null))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {consentDialog === 'OPTED_IN' ? 'Record WhatsApp opt-in' : 'Record opt-out'}
            </DialogTitle>
            <DialogDescription>
              {consentDialog === 'OPTED_IN'
                ? 'Only record opt-in the customer actually gave (for example a signed form or website checkbox). It allows templates and broadcasts.'
                : 'The contact will no longer receive templates or broadcasts.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="consent-source">How was this collected?</Label>
            <Input
              id="consent-source"
              placeholder="e.g. Website enquiry form, 12 Oct"
              value={source}
              onChange={(event) => setSource(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConsentDialog(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || source.trim().length < 3}
              onClick={() => void saveConsent()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
