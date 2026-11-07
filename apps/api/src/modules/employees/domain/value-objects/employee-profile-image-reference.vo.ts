import { EmployeeValidationError } from '../errors/employee.errors.js';

const STORED_OBJECT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class EmployeeProfileImageReference {
  private constructor(
    readonly profileImageUrl: string | null,
    readonly profileImageStoredObjectId: string | null,
  ) {}

  /** A stored object replaces any legacy URL. */
  static assignment(input: {
    readonly profileImageUrl?: string | null;
    readonly profileImageStoredObjectId?: string | null;
  }): EmployeeProfileImageReference {
    const storedObjectId = EmployeeProfileImageReference.storedObjectId(
      input.profileImageStoredObjectId,
    );
    const profileImageUrl = storedObjectId
      ? null
      : EmployeeProfileImageReference.legacyUrl(input.profileImageUrl);
    return new EmployeeProfileImageReference(profileImageUrl, storedObjectId);
  }

  private static storedObjectId(value: string | null | undefined): string | null {
    if (value === undefined || value === null || value.trim() === '') return null;
    const id = value.trim();
    if (!STORED_OBJECT_ID.test(id)) {
      throw new EmployeeValidationError('Profile image file was not found. Upload again.', [
        { path: 'profileImageStoredObjectId', message: 'Profile image file was not found. Upload again.' },
      ]);
    }
    return id;
  }

  private static legacyUrl(value: string | null | undefined): string | null {
    if (value === undefined || value === null || value.trim() === '') return null;
    const url = value.trim();
    if (url.length > 512) {
      throw new EmployeeValidationError('Profile image URL is too long.', [
        { path: 'profileImageUrl', message: 'Profile image URL is too long.' },
      ]);
    }
    try {
      new URL(url);
    } catch {
      throw new EmployeeValidationError('Enter a valid profile image URL.', [
        { path: 'profileImageUrl', message: 'Enter a valid profile image URL.' },
      ]);
    }
    return url;
  }
}
