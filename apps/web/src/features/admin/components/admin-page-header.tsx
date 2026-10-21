import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

export type AdminBreadcrumbItem = { label: string; href?: string };

export function AdminBreadcrumb({
  breadcrumbs,
  className,
}: {
  breadcrumbs: readonly AdminBreadcrumbItem[];
  className?: string;
}) {
  if (breadcrumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('text-muted-foreground text-xs', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {breadcrumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AdminPageHeader({
  breadcrumbs,
  title,
  description,
  actions,
  className,
}: {
  breadcrumbs?: readonly AdminBreadcrumbItem[];
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'border-border/60 bg-card/40 -mx-1 mb-1 rounded-lg border px-4 py-4 sm:px-5',
        className,
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <AdminBreadcrumb breadcrumbs={breadcrumbs} className="mb-2" />
      ) : null}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid min-w-0 gap-1">
          <h1 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground max-w-2xl text-sm">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
