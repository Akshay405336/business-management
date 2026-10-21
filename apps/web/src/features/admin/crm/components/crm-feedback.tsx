'use client';

import { AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';

export function CrmPageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: readonly { label: string; href?: string }[];
}) {
  return (
    <AdminPageHeader
      breadcrumbs={
        breadcrumbs ?? [
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: title },
        ]
      }
      title={title}
      description={description}
      actions={actions}
    />
  );
}

export function CrmErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function CrmLoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function CrmFieldLabel({
  htmlFor,
  required,
  optional,
  children,
}: {
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-sm">
      {children}
      {required ? <span className="text-destructive"> *</span> : null}
      {optional ? <span className="text-muted-foreground font-normal"> (Optional)</span> : null}
    </Label>
  );
}

export function CrmInlineFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-xs">{message}</p>;
}

export function CrmEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
      <Inbox className="size-8 opacity-60" aria-hidden="true" />
      <p className="text-foreground text-sm font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm">{description}</p> : null}
    </div>
  );
}
