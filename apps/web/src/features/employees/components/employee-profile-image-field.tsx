'use client';

import {
  ImageUploadField,
  revokeDeferredImagePreview,
  type DeferredImageUploadValue,
} from '@/features/admin/media/components/image-upload-field';
import { EmployeeAvatar } from './employee-avatar';

export type EmployeeProfileImageFormValue = {
  /** Saved server preview path (edit mode). */
  readonly savedPreviewUrl: string | null;
  readonly localPreviewUrl: string | null;
  readonly pendingFile: File | null;
  readonly removeOnSave: boolean;
};

export function employeeProfileImageDisplayUrl(value: EmployeeProfileImageFormValue): string | null {
  if (value.localPreviewUrl) return value.localPreviewUrl;
  if (value.removeOnSave) return null;
  return value.savedPreviewUrl;
}

export function employeeProfileImageToDeferred(value: EmployeeProfileImageFormValue): DeferredImageUploadValue {
  return {
    previewUrl: employeeProfileImageDisplayUrl(value),
    pendingFile: value.pendingFile,
    removed: value.removeOnSave,
  };
}

export function EmployeeProfileImageField({
  displayName,
  value,
  onChange,
  disabled,
}: {
  displayName: string;
  value: EmployeeProfileImageFormValue;
  onChange: (next: EmployeeProfileImageFormValue) => void;
  disabled?: boolean;
}) {
  return (
    <ImageUploadField
      label="Profile image"
      optional
      displayName={displayName}
      disabled={disabled}
      value={employeeProfileImageToDeferred(value)}
      onChange={(next) => {
        if (next.pendingFile && next.previewUrl?.startsWith('blob:')) {
          onChange({
            savedPreviewUrl: value.savedPreviewUrl,
            localPreviewUrl: next.previewUrl,
            pendingFile: next.pendingFile,
            removeOnSave: false,
          });
          return;
        }
        if (next.removed) {
          revokeDeferredImagePreview(value.localPreviewUrl);
          onChange({
            savedPreviewUrl: value.savedPreviewUrl,
            localPreviewUrl: null,
            pendingFile: null,
            removeOnSave: true,
          });
        }
      }}
      renderPreview={(previewUrl, name) => (
        <EmployeeAvatar displayName={name} profileImageUrl={previewUrl} lazyLoad={false} />
      )}
    />
  );
}
