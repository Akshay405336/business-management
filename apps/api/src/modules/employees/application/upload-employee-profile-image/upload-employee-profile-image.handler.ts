import { Inject, Injectable } from '@nestjs/common';
import type { EmployeeProfileImageUploadResponse } from '@techwin/contracts';
import {
  MediaStorageError,
  MediaValidationError,
  StoredFileService,
} from '../../../media/index.js';
import { EmployeeValidationError } from '../../domain/errors/employee.errors.js';
import { EmployeeProfileImagePolicy } from '../../domain/policies/employee-profile-image.policy.js';
import type { UploadEmployeeProfileImageCommand } from './upload-employee-profile-image.command.js';

@Injectable()
export class UploadEmployeeProfileImageHandler {
  constructor(@Inject(StoredFileService) private readonly storedFiles: StoredFileService) {}

  async execute(
    command: UploadEmployeeProfileImageCommand,
  ): Promise<EmployeeProfileImageUploadResponse> {
    const file = command.file;
    EmployeeProfileImagePolicy.assertUploadBytes(file?.buffer?.length ?? 0);
    let uploaded;
    try {
      uploaded = await this.storedFiles.upload({
        organizationId: command.actor.organizationId,
        adminId: command.actor.adminId,
        category: 'EMPLOYEE_PROFILE_IMAGE',
        file,
      });
    } catch (error) {
      if (error instanceof MediaValidationError) {
        throw new EmployeeValidationError(error.message);
      }
      if (error instanceof MediaStorageError) {
        throw new EmployeeValidationError('Profile image upload failed. Try again.');
      }
      throw error;
    }
    return {
      profileImageStoredObjectId: uploaded.id,
      profileImageUrl: uploaded.previewUrl,
    };
  }
}
