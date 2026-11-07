import { Injectable } from '@nestjs/common';
import type { LegacyEmployeeProfileImageReader } from '../../domain/repositories/legacy-employee-profile-image.reader.js';
import { resolveLegacyEmployeeProfileImage } from './legacy-employee-profile-image.js';

@Injectable()
export class FilesystemLegacyEmployeeProfileImageStore implements LegacyEmployeeProfileImageReader {
  resolve(organizationId: string, fileName: string): string | null {
    return resolveLegacyEmployeeProfileImage(organizationId, fileName);
  }
}
