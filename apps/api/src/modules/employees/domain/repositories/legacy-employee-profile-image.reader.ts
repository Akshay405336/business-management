export interface LegacyEmployeeProfileImageReader {
  resolve(organizationId: string, fileName: string): string | null;
}

export const LEGACY_EMPLOYEE_PROFILE_IMAGE_READER = Symbol(
  'LEGACY_EMPLOYEE_PROFILE_IMAGE_READER',
);
