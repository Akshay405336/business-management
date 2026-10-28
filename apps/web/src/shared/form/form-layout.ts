import { cn } from '@/shared/lib/utils';

/** Two-column admin form grid (stacks on mobile). */
export const formGridClass =
  'grid grid-cols-1 items-start gap-x-[18px] gap-y-5 sm:grid-cols-2';

/** Span both columns on sm+ breakpoints. */
export const formGridFullWidthClass = 'min-w-0 sm:col-span-2';

/** Single field column: label → control → message. */
export const formFieldClass = 'flex min-w-0 flex-col gap-2';

/** Consistent label row height for grid alignment. */
export const formFieldLabelClass =
  'type-form-label m-0 flex min-h-6 items-center gap-1 leading-6';

/**
 * Wraps controls so inputs and selects share compact height in form contexts.
 * Validation rings/borders must not change layout (border width stays 1px).
 */
export const formFieldControlShellClass = cn(
  'box-border w-full min-w-0',
  '[&_[data-slot=input]:not([type=checkbox]):not([type=radio])]:h-9',
  '[&_[data-slot=select-trigger]:not([data-size=sm])]:h-9',
  '[&_[data-slot=textarea]]:min-h-[5rem]',
);

export const formControlHeightClass = 'h-9';
