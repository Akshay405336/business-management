import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { EmployeeProfileImagePolicy } from '../../domain/policies/employee-profile-image.policy.js';

const ORGANIZATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolveLegacyEmployeeProfileImage(
  organizationId: string,
  fileName: string,
): string | null {
  if (!EmployeeProfileImagePolicy.legacyFileNameIsSafe(fileName)) return null;
  if (!ORGANIZATION_ID.test(organizationId)) return null;
  const root = resolve(process.cwd(), 'data', 'uploads', 'employees');
  const absolutePath = resolve(root, organizationId, fileName);
  if (!absolutePath.startsWith(root + sep)) return null;
  if (!existsSync(absolutePath)) return null;
  return absolutePath;
}
