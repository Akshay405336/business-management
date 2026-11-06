'use client';

import type { PointerEvent, ReactNode } from 'react';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import {
  buildLeadMailtoUrl,
  buildLeadWhatsAppUrl,
  leadEmailDisplayValue,
  leadPhoneDisplayValue,
} from '../utils/lead-contact-links';

export function stopLeadCardPointer(event: PointerEvent) {
  event.stopPropagation();
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('size-3.5 shrink-0', className)}
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ContactActionLink({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-sm p-0.5 transition-opacity hover:opacity-80',
        className,
      )}
      onPointerDown={stopLeadCardPointer}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </a>
  );
}

function ContactIconButton({
  href,
  label,
  className,
  children,
}: {
  href: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div onPointerDown={stopLeadCardPointer} onClick={(event) => event.stopPropagation()}>
      <Button
        asChild
        type="button"
        variant="ghost"
        size="icon-sm"
        className={cn('size-6 shrink-0', className)}
      >
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
          {children}
        </a>
      </Button>
    </div>
  );
}

export function LeadPhoneTextRow({
  phone,
  className,
}: {
  phone: string | null | undefined;
  className?: string;
}) {
  const display = leadPhoneDisplayValue(phone);
  if (!display) return null;
  return (
    <p
      className={cn(
        'text-muted-foreground truncate text-[13px] leading-tight tabular-nums',
        className,
      )}
    >
      {display}
    </p>
  );
}

export function LeadEmailTextRow({
  email,
  className,
}: {
  email: string | null | undefined;
  className?: string;
}) {
  const display = leadEmailDisplayValue(email);
  if (!display) return null;
  return (
    <p className={cn('text-muted-foreground truncate text-[13px] leading-tight', className)}>
      {display}
    </p>
  );
}

export function LeadWhatsAppIconButton({ phone }: { phone: string | null | undefined }) {
  const whatsAppUrl = buildLeadWhatsAppUrl(phone);
  if (!whatsAppUrl) return null;
  return (
    <ContactIconButton href={whatsAppUrl} label="Open WhatsApp" className="text-green-600 hover:text-green-600">
      <WhatsAppIcon />
    </ContactIconButton>
  );
}

export function LeadEmailIconButton({ email }: { email: string | null | undefined }) {
  const mailtoUrl = buildLeadMailtoUrl(email);
  if (!mailtoUrl) return null;
  return (
    <ContactIconButton
      href={mailtoUrl}
      label="Send email"
      className="text-muted-foreground hover:text-foreground"
    >
      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
    </ContactIconButton>
  );
}

export function LeadPhoneQuickRow({
  phone,
  className,
}: {
  phone: string | null | undefined;
  className?: string;
}) {
  const display = leadPhoneDisplayValue(phone);
  const whatsAppUrl = buildLeadWhatsAppUrl(phone);
  if (!display) return null;

  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      <span className="text-muted-foreground min-w-0 flex-1 truncate text-[13px] leading-tight tabular-nums">
        {display}
      </span>
      {whatsAppUrl ? (
        <ContactActionLink href={whatsAppUrl} label="Open WhatsApp" className="text-green-600">
          <WhatsAppIcon />
        </ContactActionLink>
      ) : null}
    </div>
  );
}

export function LeadEmailQuickRow({
  email,
  className,
}: {
  email: string | null | undefined;
  className?: string;
}) {
  const display = leadEmailDisplayValue(email);
  const mailtoUrl = buildLeadMailtoUrl(email);
  if (!display || !mailtoUrl) return null;

  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      <span className="text-muted-foreground min-w-0 flex-1 truncate text-[13px] leading-tight">
        {display}
      </span>
      <ContactActionLink
        href={mailtoUrl}
        label="Send email"
        className="text-muted-foreground hover:text-foreground"
      >
        <Mail className="size-3.5 shrink-0" aria-hidden="true" />
      </ContactActionLink>
    </div>
  );
}
