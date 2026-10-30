import { EMPLOYEE_ROUTES } from '@techwin/contracts';
import { apiConfig } from '@/shared/api/api-config';

export function resolveEmployeeProfileImageSrc(profileImageUrl: string | null | undefined): string | null {
  if (!profileImageUrl) return null;
  const legacyStoredObject = profileImageUrl.match(
    /\/media\/objects\/([0-9a-f-]{36})\/content/i,
  );
  if (legacyStoredObject?.[1]) {
    profileImageUrl = EMPLOYEE_ROUTES.employeeStoredProfileImageContent(legacyStoredObject[1]);
  }
  if (
    profileImageUrl.startsWith('blob:') ||
    profileImageUrl.startsWith('data:') ||
    profileImageUrl.startsWith('http://') ||
    profileImageUrl.startsWith('https://')
  ) {
    return profileImageUrl;
  }
  const base = apiConfig.baseUrl.replace(/\/$/, '');
  const path = profileImageUrl.startsWith('/') ? profileImageUrl : `/${profileImageUrl}`;
  return base ? `${base}${path}` : path;
}
