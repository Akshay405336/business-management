import { Inject, Injectable } from '@nestjs/common';
import { EmployeeProfileImagePolicy } from '../../domain/policies/employee-profile-image.policy.js';
import {
  LEGACY_EMPLOYEE_PROFILE_IMAGE_READER,
  type LegacyEmployeeProfileImageReader,
} from '../../domain/repositories/legacy-employee-profile-image.reader.js';
import type { StreamLegacyProfileImageQuery } from './stream-legacy-profile-image.query.js';
import type { StreamLegacyProfileImageResult } from './stream-legacy-profile-image.result.js';

@Injectable()
export class StreamLegacyProfileImageHandler {
  constructor(
    @Inject(LEGACY_EMPLOYEE_PROFILE_IMAGE_READER)
    private readonly images: LegacyEmployeeProfileImageReader,
  ) {}

  execute(query: StreamLegacyProfileImageQuery): StreamLegacyProfileImageResult {
    if (!EmployeeProfileImagePolicy.sameOrganization(query.trustedOrganizationId, query.organizationId)) {
      return { kind: 'not_found' };
    }
    const absolutePath = this.images.resolve(query.organizationId, query.fileName);
    if (!absolutePath) return { kind: 'not_found' };
    return { kind: 'stream', absolutePath };
  }
}
