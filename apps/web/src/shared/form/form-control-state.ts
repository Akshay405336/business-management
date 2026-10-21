import { cn } from '@/shared/lib/utils';

export type FormControlState = 'neutral' | 'valid' | 'invalid';

export function formControlStateAttrs(
  state: FormControlState,
  disabled?: boolean,
): {
  'data-state': FormControlState;
  'aria-invalid'?: boolean;
} {
  if (disabled || state === 'neutral') {
    return { 'data-state': 'neutral' };
  }
  if (state === 'invalid') {
    return { 'data-state': 'invalid', 'aria-invalid': true };
  }
  return { 'data-state': 'valid', 'aria-invalid': false };
}

/** Tailwind classes for valid/invalid borders (focus ring unchanged). */
export function formControlStateClass(state: FormControlState, disabled?: boolean): string {
  if (disabled || state === 'neutral') return '';
  if (state === 'invalid') {
    return 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25';
  }
  return 'border-success/70 focus-visible:border-success/80';
}

export function mergeFormControlClass(
  state: FormControlState,
  className?: string,
  disabled?: boolean,
): string {
  return cn(formControlStateClass(state, disabled), className);
}

export function focusFirstInvalidField(container?: HTMLElement | null) {
  const root = container ?? document;
  const target =
    root.querySelector<HTMLElement>('[data-state="invalid"]:not([disabled])') ??
    root.querySelector<HTMLElement>('[aria-invalid="true"]:not([disabled])');
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
