import { cn } from '@/shared/lib/utils';

export function ProjectProgressBar({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className={cn('grid min-w-0 gap-1', className)}>
      <span className="text-muted-foreground text-xs tabular-nums">{clamped}%</span>
      <div
        className="bg-muted h-1.5 w-full min-w-[4rem] overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
