'use client';

import {
  useEffect,
  useRef,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
} from 'react';
import { cn } from '@/shared/lib/utils';

interface TotpCodeInputProps {
  /** Contiguous digits entered so far (0..length characters). */
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly length?: number;
  readonly disabled?: boolean;
  readonly invalid?: boolean;
  readonly autoFocus?: boolean;
  readonly describedBy?: string | undefined;
  readonly labelledBy?: string;
}

const onlyDigits = (raw: string): string => raw.replace(/\D/g, '');

export function TotpCodeInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  invalid = false,
  autoFocus = false,
  describedBy,
  labelledBy,
}: TotpCodeInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const focusAt = (index: number) => {
    const target = inputs.current[Math.max(0, Math.min(index, length - 1))];
    target?.focus();
    target?.select();
  };

  // After the value is cleared (e.g. a rejected code), return focus to the first box.
  useEffect(() => {
    if (value === '' && !disabled && autoFocus) inputs.current[0]?.focus();
  }, [value, disabled, autoFocus]);

  /** Writes `digits` starting at `index`, overwriting existing digits. */
  const writeAt = (index: number, digits: string) => {
    const start = Math.min(index, value.length);
    const next = (value.slice(0, start) + digits + value.slice(start + digits.length)).slice(
      0,
      length,
    );
    onChange(next);
    focusAt(start + digits.length);
  };

  const handleChange = (index: number) => (event: ChangeEvent<HTMLInputElement>) => {
    const digits = onlyDigits(event.currentTarget.value);
    if (!digits) return;
    // One-time-code autofill delivers the whole code into a single box.
    if (digits.length >= length) {
      onChange(digits.slice(0, length));
      focusAt(length - 1);
      return;
    }
    // Typing into a box that already holds a digit without it being selected.
    const existing = value[index];
    const typed =
      existing && digits.length === 2 ? (digits[0] === existing ? digits[1]! : digits[0]!) : digits;
    writeAt(index, typed);
  };

  const handleKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Backspace': {
        event.preventDefault();
        if (value[index] !== undefined) {
          onChange(value.slice(0, index) + value.slice(index + 1));
          focusAt(index);
        } else if (index > 0) {
          onChange(value.slice(0, index - 1) + value.slice(index));
          focusAt(index - 1);
        }
        break;
      }
      case 'Delete': {
        event.preventDefault();
        onChange(value.slice(0, index) + value.slice(index + 1));
        break;
      }
      case 'ArrowLeft':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusAt(Math.min(index + 1, value.length));
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(value.length);
        break;
      default:
        break;
    }
  };

  const handlePaste = (index: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const digits = onlyDigits(event.clipboardData.getData('text'));
    if (!digits) return;
    writeAt(digits.length >= length ? 0 : index, digits.slice(0, length));
  };

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className="flex w-full items-center justify-between gap-2 sm:gap-3"
    >
      {Array.from({ length }, (_, index) => {
        const digit = value[index] ?? '';
        return (
          <input
            key={index}
            ref={(element) => {
              inputs.current[index] = element;
            }}
            value={digit}
            onChange={handleChange(index)}
            onKeyDown={handleKeyDown(index)}
            onPaste={handlePaste(index)}
            // Never let focus land beyond the first empty box.
            onFocus={(event) => {
              if (index > value.length) focusAt(value.length);
              else event.currentTarget.select();
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoFocus={autoFocus && index === 0}
            disabled={disabled}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={invalid}
            className={cn(
              'bg-card text-foreground aspect-square w-full max-w-14 min-w-0 rounded-lg border text-center font-mono text-xl font-semibold shadow-xs transition-[border-color,box-shadow] outline-none sm:text-2xl',
              'border-input focus:border-ring focus:ring-ring/40 focus:ring-[3px]',
              digit && 'border-primary/50',
              invalid && 'border-destructive focus:ring-destructive/25',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          />
        );
      })}
    </div>
  );
}
