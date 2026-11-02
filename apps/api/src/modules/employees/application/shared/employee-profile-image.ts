import type { StoredFileService } from '../../../media/index.js';
import { EmployeeValidationError } from '../../domain/errors/employee.errors.js';
import { MediaConflictError, MediaNotFoundError } from '../../../media/index.js';

export async function validateProfileImageAssignment(
  storedFiles: StoredFileService,
  organizationId: string,
  profileImageStoredObjectId: string | null | undefined,
  employeeId?: string,
): Promise<void> {
  if (!profileImageStoredObjectId) return;
  try {
    await storedFiles.assertAssignableProfileImage(
      organizationId,
      profileImageStoredObjectId,
      employeeId,
    );
  } catch (error) {
    if (error instanceof MediaNotFoundError) {
      throw new EmployeeValidationError('Profile image file was not found. Upload again.');
    }
    if (error instanceof MediaConflictError) {
      throw new EmployeeValidationError(error.message);
    }
    throw error;
  }
}
