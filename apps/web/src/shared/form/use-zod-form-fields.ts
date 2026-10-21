'use client';

import { useCallback, useMemo, useState } from 'react';
import type { z } from 'zod';
import type { FormControlState } from './form-control-state';
import { formControlStateAttrs } from './form-control-state';
import { zodFieldError } from './zod-field-error';

type FieldSchemas = Record<string, z.ZodType>;

function valueHasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

export function useZodFormFields<T extends FieldSchemas>(
  schemas: T,
  values: { [K in keyof T]: unknown },
  options?: { disabled?: boolean },
) {
  type Key = keyof T & string;
  const keys = Object.keys(schemas) as Key[];
  const disabled = options?.disabled ?? false;

  const [touched, setTouched] = useState<Partial<Record<Key, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const shouldValidate = useCallback(
    (key: Key) => {
      if (submitAttempted || touched[key]) return true;
      return valueHasContent(values[key]);
    },
    [submitAttempted, touched, values],
  );

  const errors = useMemo(() => {
    const next: Partial<Record<Key, string>> = {};
    for (const key of keys) {
      if (!shouldValidate(key)) continue;
      const schema = schemas[key];
      if (!schema) continue;
      const message = zodFieldError(schema, values[key]);
      if (message) next[key] = message;
    }
    return next;
  }, [keys, schemas, shouldValidate, values]);

  const controlState = useCallback(
    (key: Key): FormControlState => {
      if (disabled || !shouldValidate(key)) return 'neutral';
      return errors[key] ? 'invalid' : 'valid';
    },
    [disabled, errors, shouldValidate],
  );

  const touch = useCallback((key: Key) => {
    setTouched((current) => ({ ...current, [key]: true }));
  }, []);

  const touchAll = useCallback(() => {
    setTouched(Object.fromEntries(keys.map((key) => [key, true])) as Partial<Record<Key, boolean>>);
  }, [keys]);

  const prepareSubmit = useCallback(() => {
    setSubmitAttempted(true);
    touchAll();
  }, [touchAll]);

  const reset = useCallback(() => {
    setTouched({});
    setSubmitAttempted(false);
  }, []);

  const controlProps = useCallback(
    (key: Key, id?: string) => {
      const state = controlState(key);
      const error = errors[key];
      return {
        ...formControlStateAttrs(state, disabled),
        'aria-describedby': error && id ? `${id}-error` : undefined,
        onBlur: () => touch(key),
      };
    },
    [controlState, disabled, errors, touch],
  );

  const isValid = useMemo(
    () =>
      keys.every((key) => {
        const schema = schemas[key];
        return schema ? !zodFieldError(schema, values[key]) : true;
      }),
    [keys, schemas, values],
  );

  return {
    errors,
    controlState,
    controlProps,
    touch,
    touchAll,
    prepareSubmit,
    reset,
    submitAttempted,
    isValid,
  };
}
