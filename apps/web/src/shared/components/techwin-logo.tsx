import { cn } from '@/shared/lib/utils';

export function TechwinMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M10 9.5h12v2.75H15.1v10.25h-2.2V12.25H10V9.5z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

export function TechwinLogo({
  className,
  subtitle,
  compact = false,
  title = 'Techwin',
}: {
  className?: string;
  subtitle?: string;
  compact?: boolean;
  /** Primary brand line; sidebar uses “Techwin Pvt Ltd”. */
  title?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <TechwinMark className={compact ? 'size-8' : undefined} />
      <div className="flex min-w-0 flex-col leading-tight">
        <span
          className={cn(
            'text-foreground truncate tracking-tight',
            compact ? 'text-[13px] font-bold' : 'text-[15px] font-semibold',
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="text-muted-foreground mt-0.5 truncate text-[11px]">{subtitle}</span>
        ) : null}
      </div>
    </div>
  );
}
