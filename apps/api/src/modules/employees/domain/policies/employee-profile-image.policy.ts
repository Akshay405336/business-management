import { EmployeeValidationError } from '../errors/employee.errors.js';
import { EmployeeProfileImageReference } from '../value-objects/employee-profile-image-reference.vo.js';

const LEGACY_FILE_NAME = /^[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i;

export class EmployeeProfileImagePolicy {
  static assertUploadBytes(byteLength: number): void {
    if (byteLength <= 0) {
      throw new EmployeeValidationError('Select a profile image to upload.');
    }
  }

  static sameOrganization(trustedOrganizationId: string, requestedOrganizationId: string): boolean {
    return trustedOrganizationId === requestedOrganizationId;
  }

  static legacyFileNameIsSafe(fileName: string): boolean {
    return LEGACY_FILE_NAME.test(fileName);
  }

  static normalizeAssignment(input: {
    readonly profileImageUrl?: string | null;
    readonly profileImageStoredObjectId?: string | null;
  }): { readonly profileImageUrl: string | null; readonly profileImageStoredObjectId: string | null } {
    const reference = EmployeeProfileImageReference.assignment(input);
    return {
      profileImageUrl: reference.profileImageUrl,
      profileImageStoredObjectId: reference.profileImageStoredObjectId,
    };
  }
}
