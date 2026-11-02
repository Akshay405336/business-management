'use client';

import { PLATFORM_PASSWORD_MIN_LENGTH } from '@techwin/validation';
import { Eye, EyeOff } from 'lucide-react';

export const PASSWORD_REQUIREMENTS = `At least ${PLATFORM_PASSWORD_MIN_LENGTH} characters with upper- and lower-case letters, a digit, and a symbol.`;

/** Show/hide button placed inside a `relative` wrapper around a password input (add `pr-11` to the input). */
export function PasswordToggle({
  pressed,
  onToggle,
  disabled,
}: {
  pressed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
      aria-label={pressed ? 'Hide password' : 'Show password'}
    >
      {pressed ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </button>
  );
}
