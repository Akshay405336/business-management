import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface AuthFormFieldProps {
  readonly id: string;
  readonly label: string;
  readonly error?: string | undefined;
  /** Rendered next to the label, e.g. a hint link. */
  readonly labelAside?: ReactNode;
  /** Receives the `aria-*` props the control must spread for accessibility. */
  readonly children: (control: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

export function AuthFormField({ id, label, error, labelAside, children }: AuthFormFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label}</Label>
        {labelAside}
      </div>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })}
      {error ? (
        <p id={errorId} className="text-destructive text-[13px]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
