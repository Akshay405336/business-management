'use client';

import { AlertCircle, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/features/admin/components/admin-page-header';
import {
  formFieldClass,
  formFieldControlShellClass,
  formFieldLabelClass,
} from '@/shared/form/form-layout';
import { cn } from '@/shared/lib/utils';

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
    <div className="grid gap-2" aria-busy="true" aria-label="Loading">
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
    <Label htmlFor={htmlFor} className={formFieldLabelClass}>
      <span className="min-w-0 truncate">{children}</span>
      {required ? <span className="text-destructive shrink-0"> *</span> : null}
      {optional ? (
        <span className="text-muted-foreground shrink-0 font-normal"> (Optional)</span>
      ) : null}
    </Label>
  );
}

export function CrmInlineFieldError({
  message,
  id,
  reserveSpace = true,
}: {
  message?: string;
  id?: string;
  reserveSpace?: boolean;
}) {
  if (!message && !reserveSpace) return null;
  return (
    <p
      id={id}
      role={message ? 'alert' : undefined}
      className={cn(
        'text-destructive text-xs leading-snug',
        reserveSpace && 'min-h-[1.125rem]',
      )}
    >
      {message ?? '\u00a0'}
    </p>
  );
}

export function CrmReadOnlyField({
  label,
  required,
  optional,
  className,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(formFieldClass, className)}>
      <CrmFieldLabel required={required} optional={optional}>
        {label}
      </CrmFieldLabel>
      <div className={cn(formFieldControlShellClass, 'text-foreground flex items-center text-sm')}>
        {children}
      </div>
    </div>
  );
}

export function CrmFormField({
  id,
  label,
  required,
  optional,
  error,
  validated = false,
  className,
  children,
}: {
  id?: string;
  label: ReactNode;
  required?: boolean;
  optional?: boolean;
  error?: string;
  /** When true, keeps a single-line error slot for live validation without shifting neighbors. */
  validated?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const errorId = id ? `${id}-error` : undefined;
  const showErrorSlot = validated || Boolean(error);
  return (
    <div className={cn(formFieldClass, className)}>
      <CrmFieldLabel htmlFor={id} required={required} optional={optional}>
        {label}
      </CrmFieldLabel>
      <div className={formFieldControlShellClass}>{children}</div>
      {showErrorSlot ? (
        <CrmInlineFieldError id={errorId} message={error} reserveSpace={validated} />
      ) : null}
    </div>
  );
}


export { formGridClass, formGridFullWidthClass } from '@/shared/form/form-layout';

export function CrmEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-12 text-center">
      <Inbox className="size-8 opacity-60" aria-hidden="true" />
      <p className="text-foreground text-sm font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm">{description}</p> : null}
    </div>
  );
}
