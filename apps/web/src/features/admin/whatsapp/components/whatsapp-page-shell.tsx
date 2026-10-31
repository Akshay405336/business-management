'use client';

import type { ReactNode } from 'react';
import { AdminBreadcrumb } from '@/features/admin/components/admin-page-header';
import { CrmToolbarHeader } from '@/features/admin/crm/components/crm-toolbar-header';
import { cn } from '@/shared/lib/utils';

export function WhatsAppPageShell({
  title,
  description,
  toolbar,
  bottomRow,
  children,
  className,
}: {
  title: string;
  description: string;
  toolbar?: ReactNode;
  bottomRow?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto grid w-full max-w-[1400px] gap-3', className)}>
      <AdminBreadcrumb
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin/dashboard' },
          { label: 'Communications' },
          { label: title },
        ]}
        className="mb-0.5"
      />
      <section className="workspace-surface min-w-0">
        <CrmToolbarHeader
          title={title}
          description={description}
          className="bg-card rounded-none border-0 shadow-none"
          headerRowClassName="flex-wrap items-center gap-3 min-w-0"
          titleSectionClassName="min-w-0"
          toolbarRowClassName="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2"
          toolbar={toolbar ?? null}
          bottomRow={bottomRow}
        />
      </section>
      {children}
    </div>
  );
}

export function CopyField({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <div className="flex min-w-0 items-center gap-2 rounded-md border bg-neutral-50 px-2.5 py-1.5">
        <code className={cn('min-w-0 flex-1 truncate text-xs', secret && 'tracking-wider')}>
          {value}
        </code>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground shrink-0 text-xs font-medium"
          onClick={() => void navigator.clipboard.writeText(value)}
        >
          Copy
        </button>
      </div>
    </div>
  );
}
