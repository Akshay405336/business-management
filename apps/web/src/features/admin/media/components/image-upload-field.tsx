'use client';

import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CrmFormField } from '@/features/admin/crm/components/crm-feedback';

/** Local-only selection; upload to storage happens when the parent form saves. */
export type DeferredImageUploadValue = {
  readonly previewUrl: string | null;
  readonly pendingFile: File | null;
  /** User cleared the image; parent should persist removal on save. */
  readonly removed: boolean;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function revokeDeferredImagePreview(previewUrl: string | null | undefined): void {
  if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
}

export function ImageUploadField({
  label,
  optional,
  displayName,
  value,
  onChange,
  disabled,
  renderPreview,
}: {
  label: string;
  optional?: boolean;
  displayName: string;
  value: DeferredImageUploadValue;
  onChange: (next: DeferredImageUploadValue) => void;
  disabled?: boolean;
  renderPreview: (previewUrl: string | null, displayName: string) => ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const pickFile = (file: File) => {
    setError(null);
    if (!ALLOWED.has(file.type)) {
      setError('Use a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 5 MB or smaller.');
      return;
    }
    revokeDeferredImagePreview(value.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    onChange({ previewUrl, pendingFile: file, removed: false });
  };

  return (
    <CrmFormField label={label} optional={optional} error={error ?? undefined}>
      <div className="flex flex-wrap items-center gap-3">
        {renderPreview(value.previewUrl, displayName)}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) pickFile(file);
            event.target.value = '';
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {value.previewUrl ? 'Replace' : 'Upload'}
          </Button>
          {value.previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                revokeDeferredImagePreview(value.previewUrl);
                onChange({ previewUrl: null, pendingFile: null, removed: true });
              }}
            >
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </CrmFormField>
  );
}
