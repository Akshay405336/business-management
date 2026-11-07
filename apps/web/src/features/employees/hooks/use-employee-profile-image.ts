'use client';

import { useCallback } from 'react';
import { useAsyncAction } from '@/features/admin/crm/hooks/use-async-action';
import { uploadEmployeeProfileImage } from '../api/employee.api';
import type { EmployeeProfileImageUploadResponse } from '@techwin/contracts';

export function useEmployeeProfileImage() {
  const { pending, run } = useAsyncAction();
  const upload = useCallback(
    (file: File): Promise<EmployeeProfileImageUploadResponse | undefined> =>
      run(() => uploadEmployeeProfileImage(file)),
    [run],
  );
  return { uploadEmployeeProfileImage: upload, pending };
}
