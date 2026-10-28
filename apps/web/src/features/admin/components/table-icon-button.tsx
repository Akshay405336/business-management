'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/shared/lib/utils';

type TableIconButtonProps = Omit<ComponentProps<typeof Button>, 'size' | 'variant'> & {
  label: string;
  tone?: 'default' | 'primary' | 'success' | 'danger';
  children: ReactNode;
};

const toneClass: Record<NonNullable<TableIconButtonProps['tone']>, string> = {
  default: '',
  primary: 'text-primary hover:bg-primary/10 hover:text-primary',
  success: 'text-emerald-600 hover:bg-emerald-600/10 hover:text-emerald-700',
  danger: 'text-destructive hover:bg-destructive/10 hover:text-destructive',
};

export function TableIconButton({
  label,
  tone = 'default',
  className,
  children,
  ...props
}: TableIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn('size-8', toneClass[tone], className)}
          aria-label={label}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
