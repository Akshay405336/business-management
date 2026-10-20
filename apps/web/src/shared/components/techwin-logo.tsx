import { cn } from '@/shared/lib/utils';

export function TechwinMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8', className)}>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M9 10.5h14v3.2h-5.4V23h-3.2v-9.3H9z" className="fill-primary-foreground" />
      <circle cx="22.5" cy="21.5" r="2" className="fill-primary-foreground/70" />
    </svg>
  );
}

export function TechwinLogo({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <TechwinMark />
      <div className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">Techwin</span>
        {subtitle ? <span className="text-muted-foreground mt-1 text-xs">{subtitle}</span> : null}
      </div>
    </div>
  );
}
